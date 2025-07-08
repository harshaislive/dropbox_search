import weaviate, { WeaviateClient } from 'weaviate-ts-client';
import { SEARCH_CONFIG as CONFIG, QUERY_EXPANSIONS } from './search-config';

// Note: Next.js provides fetch polyfill, no need to import node-fetch

let client: WeaviateClient | null = null;

export function getWeaviateClient(): WeaviateClient {
  if (!client) {
    if (!process.env.WEAVIATE_URL) {
      throw new Error('WEAVIATE_URL environment variable is required');
    }
    
    if (!process.env.WEAVIATE_API_KEY) {
      throw new Error('WEAVIATE_API_KEY environment variable is required');
    }

    client = weaviate.client({
      scheme: 'https',
      host: process.env.WEAVIATE_URL.replace('https://', '').replace('http://', ''),
      apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY),
    });
  }
  
  return client;
}

export interface WeaviateSchema {
  class: string;
  description: string;
  properties: Array<{
    name: string;
    dataType: string[];
    description: string;
  }>;
}

export async function getWeaviateSchema(): Promise<WeaviateSchema[]> {
  const client = getWeaviateClient();
  
  try {
    const schema = await client.schema.getter().do();
    return (schema.classes || []).map((cls: any) => ({
      class: cls.class,
      description: cls.description || '',
      properties: cls.properties || []
    }));
  } catch (error) {
    console.error('Error fetching Weaviate schema:', error);
    throw new Error('Failed to fetch Weaviate schema');
  }
}

export interface SearchResult {
  id: string;
  dropbox_path: string;
  file_name?: string;
  caption?: string;
  tags?: string[];
  similarity: number;
  public_url?: string;
  thumbnail_url?: string;
  download_url?: string;
  file_type?: string;
  file_size?: number;
  source: 'vector' | 'text' | 'hybrid' | 'dropbox' | 'unknown';
  metadata?: Record<string, any>;
  // Advanced scoring fields from plan.md
  composite_score?: number;
  vector_score?: number;
  text_score?: number;
  tag_score?: number;
  quality_score?: number;
  created_at?: string;
  modified_at?: string;
  modified_date?: string;
  processed_date?: string;
  content_hash?: string;
  file_extension?: string;
}

export interface SearchParams {
  query?: string;
  className: string;
  limit?: number;
  offset?: number;
  certainty?: number;
  useAdvanced?: boolean;
}

export interface DualSearchResult {
  results: SearchResult[];
  totalFound: number;
  vectorResults: number;
  textResults: number;
  processingTime: number;
}

// CLIP Service integration (from right_now.md)
async function getClipEmbedding(text: string): Promise<number[]> {
  try {
    // Use correct endpoint and query parameter format from OpenAPI spec
    const url = new URL(CONFIG.vector_search.clip_api_url + '/embed/text');
    url.searchParams.append('text', text);
    
    console.log(`🔗 Calling CLIP API for text: ${CONFIG.vector_search.clip_api_url}/embed/text`);
    console.log(`📤 Text query: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`📥 CLIP API text response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ CLIP API text error response: ${errorText}`);
      throw new Error(`CLIP API error: ${response.status} - ${errorText}`);
    }
    
    const data: any = await response.json();
    console.log(`[WEAVIATE] Received text embedding with ${data.dimensions} dimensions`);
    return data.embedding; // 512-dimensional vector
  } catch (error) {
    console.error('CLIP text embedding error:', error);
    throw error;
  }
}

/**
 * Query expansion with synonyms and related terms (from plan.md)
 */
function expandQuery(originalQuery: string): string[] {
  const variations = [originalQuery];
  const queryLower = originalQuery.toLowerCase();
  
  Object.entries(QUERY_EXPANSIONS).forEach(([key, synonyms]) => {
    if (queryLower.includes(key)) {
      variations.push(...synonyms);
      variations.push(`photo of ${key}`);
      variations.push(`${key} image`);
    }
  });

  // Add general variations
  variations.push(`photo of ${originalQuery}`);
  variations.push(`${originalQuery} image`);
  variations.push(`picture showing ${originalQuery}`);

  return Array.from(new Set(variations)); // Remove duplicates
}

/**
 * Calculate text relevance using current system weights (from right_now.md)
 */
function calculateTextRelevance(fileData: any, queryText: string): number {
  let score = 0.0;
  const queryLower = queryText.toLowerCase();
  
  // Caption match (highest weight) - from right_now.md
  const caption = fileData.caption || '';
  if (caption.toLowerCase().includes(queryLower)) {
    score += CONFIG.text_relevance_weights.caption;
  }
  
  // Filename match - from right_now.md
  const filename = fileData.file_name || '';
  if (filename.toLowerCase().includes(queryLower)) {
    score += CONFIG.text_relevance_weights.filename;
  }
  
  // Path match - from right_now.md
  const path = fileData.dropbox_path || '';
  if (path.toLowerCase().includes(queryLower)) {
    score += CONFIG.text_relevance_weights.path;
  }
  
  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Calculate text similarity between query and content (enhanced from plan.md)
 */
function calculateTextSimilarity(query: string, text: string): number {
  if (!text) return 0;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match boost
  if (textLower === queryLower) {
    return 1.5;
  }
  
  // Contains full query boost
  if (textLower.includes(queryLower)) {
    return 1.2;
  }
  
  const queryWords = queryLower.split(/\s+/);
  const textWords = textLower.split(/\s+/);
  
  let matches = 0;
  let exactWordMatches = 0;
  
  for (const queryWord of queryWords) {
    if (textWords.includes(queryWord)) {
      exactWordMatches++;
      matches++;
    } else if (textWords.some(textWord => 
      textWord.includes(queryWord) || queryWord.includes(textWord)
    )) {
      matches++;
    }
  }
  
  // All words match exactly
  if (exactWordMatches === queryWords.length && queryWords.length > 1) {
    return 1.1;
  }
  
  return queryWords.length > 0 ? matches / queryWords.length : 0;
}

/**
 * Calculate tag relevance score (from plan.md)
 */
function calculateTagRelevance(query: string, tags: string[]): number {
  if (!tags || tags.length === 0) return 0;
  
  const queryLower = query.toLowerCase();
  let relevanceScore = 0;
  
  for (const tag of tags) {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes(queryLower) || queryLower.includes(tagLower)) {
      relevanceScore += 1;
    }
  }
  
  return Math.min(relevanceScore / tags.length, 1.0);
}

/**
 * Calculate quality score based on multiple factors (from plan.md)
 */
function calculateQualityScore(result: any): number {
  let score = 1.0;
  
  // File size (larger often means better quality)
  const fileSize = result.file_size || 0;
  if (fileSize > CONFIG.quality_thresholds.high_quality_size) {
    score *= CONFIG.boosting_factors.high_quality;
  } else if (fileSize > CONFIG.quality_thresholds.medium_quality_size) {
    score *= 1.1;
  } else if (fileSize < 500000) { // <500KB
    score *= 0.9;
  }
  
  // Caption quality (longer captions often mean more detailed images)
  const caption = result.caption || '';
  if (caption.length > 100) {
    score *= 1.1;
  } else if (caption.length > CONFIG.quality_thresholds.min_caption_length) {
    score *= 1.05;
  }
  
  // Tag richness
  const tags = result.tags || [];
  if (tags.length > 5) {
    score *= 1.1;
  } else if (tags.length > 2) {
    score *= 1.05;
  }
  
  return score;
}

/**
 * Apply path-based boosting (from plan.md)
 */
function applyPathBoosting(results: SearchResult[], query: string): SearchResult[] {
  const queryTerms = query.toLowerCase().split(/\s+/);
  
  return results.map(result => {
    const path = result.dropbox_path.toLowerCase();
    let boost = 1.0;
    
    // Boost based on folder names matching query terms
    for (const term of queryTerms) {
      if (path.includes(term)) {
        boost += 0.1;
      }
    }
    
    // Boost based on organized folders
    if (path.includes('/photos/') || path.includes('/images/') || path.includes('/pictures/')) {
      boost += 0.05;
    }
    
    // Apply boost to composite score
    if (result.composite_score) {
      result.composite_score *= boost;
    }
    
    return result;
  });
}

/**
 * Apply temporal relevance boosting (from plan.md)
 */
function applyTemporalRelevance(results: SearchResult[]): SearchResult[] {
  const currentDate = new Date();
  
  return results.map(result => {
    const modifiedDate = result.modified_date ? new Date(result.modified_date) : null;
    if (modifiedDate) {
      const daysOld = Math.floor((currentDate.getTime() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let boost = 1.0;
      if (daysOld < 30) { // Last month
        boost = CONFIG.boosting_factors.recent_file;
      } else if (daysOld < 90) { // Last 3 months
        boost = 1.05;
      }
      
      if (result.composite_score) {
        result.composite_score *= boost;
      }
    }
    
    return result;
  });
}

/**
 * Semantic re-ranking with composite scoring (from plan.md)
 */
function semanticRerank(results: any[], queryText: string, topK: number = 20): SearchResult[] {
  const scoredResults = results.map(item => {
    const result = item.result || item;
    
    // Vector similarity score (using current system conversion from right_now.md)
    const distance = result._additional?.distance || 0;
    const vectorScore = Math.max(0.0, Math.min(1.0, 1.0 - distance));
    
    // Text similarity score (enhanced)
    const textScore = calculateTextSimilarity(queryText, result.caption || '');
    
    // Tag relevance score
    const tagScore = calculateTagRelevance(queryText, result.tags || []);
    
    // Quality score
    const qualityScore = calculateQualityScore(result);
    
    // Composite score with weights (from plan.md) - normalized to [0,1]
    const baseScore = (
      vectorScore * CONFIG.scoring_weights.vector_similarity +
      textScore * CONFIG.scoring_weights.text_relevance +
      tagScore * CONFIG.scoring_weights.tag_relevance
    );
    const compositeScore = Math.min(1.0, baseScore * qualityScore);
    
    return {
      ...result,
      composite_score: compositeScore,
      vector_score: vectorScore,
      text_score: textScore,
      tag_score: tagScore,
      quality_score: qualityScore,
      similarity: compositeScore // Update main similarity with composite score
    };
  });
  
  // Sort by composite score
  return scoredResults
    .sort((a, b) => b.composite_score - a.composite_score)
    .slice(0, topK);
}

/**
 * Diversify results to avoid too many similar items (from plan.md)
 */
function diversifyResults(results: SearchResult[], diversityFactor: number = 0.3): SearchResult[] {
  if (results.length <= 5) return results;
  
  const diversified = [results[0]]; // Always include top result
  
  for (const candidate of results.slice(1)) {
    let isDiverse = true;
    
    // Check similarity to already selected results
    for (const selected of diversified) {
      // Simple diversity check based on file name and path similarity
      const pathSimilarity = calculateTextSimilarity(
        candidate.dropbox_path, 
        selected.dropbox_path
      );
      const nameSimilarity = calculateTextSimilarity(
        candidate.file_name || '', 
        selected.file_name || ''
      );
      
      if (pathSimilarity > CONFIG.diversity.similarity_threshold || 
          nameSimilarity > CONFIG.diversity.similarity_threshold) {
        isDiverse = false;
        break;
      }
    }
    
    if (isDiverse || diversified.length < 3) { // Ensure minimum results
      diversified.push(candidate);
    }
    
    if (diversified.length >= results.length * (1 - diversityFactor)) {
      break;
    }
  }
  
  return diversified;
}

/**
 * Vector search implementation matching current system (from right_now.md)
 */
async function performVectorSearch(
  client: WeaviateClient, 
  query: string | undefined, 
  className: string, 
  limit: number, 
  certainty: number,
  offset: number = 0
): Promise<SearchResult[]> {
  if (!query?.trim()) return [];

  try {
    console.log(`🎯 Performing vector search with distance threshold: ${CONFIG.vector_search.distance_threshold}`);
    
    // Generate CLIP embedding using current system API
    const queryVector = await getClipEmbedding(query);
    
    // Use current system properties from right_now.md schema
    const properties = [
      'dropbox_path', 'file_name', 'file_type', 'file_size',
      'caption', 'tags', 'modified_date', 'public_url', 'thumbnail_url',
      'file_extension', 'processed_date', 'content_hash'
    ];

    const response = await client.graphql
      .get()
      .withClassName(className)
      .withFields(`${properties.join(' ')} _additional { distance id }`)
      .withNearVector({
        vector: queryVector,
        distance: CONFIG.vector_search.distance_threshold // Use optimized threshold from right_now.md
      })
      .withLimit(limit)
      .withOffset(offset)
      .do();

    const files = response?.data?.Get?.[className] || [];
    
    // Convert distance to similarity score (current system method from right_now.md)
    return files.map((file: any) => {
      const distance = file._additional?.distance || 1.0;
      const similarity = Math.max(0.0, Math.min(1.0, 1.0 - distance));
      
      return {
        id: file._additional?.id || '',
        dropbox_path: file.dropbox_path || '',
        file_name: file.file_name,
        caption: file.caption,
        tags: file.tags || [],
        similarity,
        public_url: file.public_url,
        thumbnail_url: file.thumbnail_url,
        file_type: file.file_type,
        file_size: file.file_size,
        source: 'vector' as const,
        metadata: {
          distance,
          weaviate_id: file._additional?.id
        },
        modified_date: file.modified_date,
        processed_date: file.processed_date,
        content_hash: file.content_hash,
        file_extension: file.file_extension
      };
    });

  } catch (error) {
    console.error('❌ Vector search error:', error);
    return [];
  }
}

/**
 * Text search implementation matching current system (from right_now.md)
 */
async function performTextSearch(
  client: WeaviateClient,
  query: string | undefined,
  className: string,
  limit: number,
  offset: number = 0
): Promise<SearchResult[]> {
  if (!query?.trim()) return [];

  try {
    console.log('📝 Performing text search with current system operators...');
    
    // Use current system properties from right_now.md schema
    const properties = [
      'dropbox_path', 'file_name', 'file_type', 'file_size',
      'caption', 'tags', 'modified_date', 'public_url', 'thumbnail_url',
      'file_extension', 'processed_date', 'content_hash'
    ];

    // Current system text search logic from right_now.md
    const response = await client.graphql
      .get()
      .withClassName(className)
      .withFields(`${properties.join(' ')} _additional { id }`)
      .withWhere({
        operator: 'Or',
        operands: [
          {
            path: ['caption'],
            operator: 'Like',
            valueText: `*${query}*`
          },
          {
            path: ['file_name'],
            operator: 'Like', 
            valueText: `*${query}*`
          },
          {
            path: ['dropbox_path'],
            operator: 'Like',
            valueText: `*${query}*`
          }
        ]
      })
      .withLimit(limit)
      .withOffset(offset)
      .do();

    const files = response?.data?.Get?.[className] || [];
    
    // Apply current system text relevance scoring from right_now.md
    return files.map((file: any) => {
      const textRelevance = calculateTextRelevance(file, query);
      
      return {
        id: file._additional?.id || '',
        dropbox_path: file.dropbox_path || '',
        file_name: file.file_name,
        caption: file.caption,
        tags: file.tags || [],
        similarity: textRelevance,
        public_url: file.public_url,
        thumbnail_url: file.thumbnail_url,
        file_type: file.file_type,
        file_size: file.file_size,
        source: 'text' as const,
        metadata: {
          text_relevance: textRelevance,
          weaviate_id: file._additional?.id
        },
        modified_date: file.modified_date,
        processed_date: file.processed_date,
        content_hash: file.content_hash,
        file_extension: file.file_extension
      };
    });

  } catch (error) {
    console.error('❌ Text search error:', error);
    return [];
  }
}

/**
 * Current system deduplication logic (from right_now.md)
 */
function deduplicateAndRankResults(
  allResults: Array<{source: string, result: SearchResult}>
): SearchResult[] {
  const seenFiles: Record<string, boolean> = {};
  const combined: SearchResult[] = [];
  
  // Step 1: Add vector results first (higher priority) - from right_now.md
  const vectorResults = allResults.filter(r => r.source === 'vector');
  for (const { result } of vectorResults) {
    const fileId = result.id || result.dropbox_path;
    if (fileId && !seenFiles[fileId]) {
      result.source = 'vector';
      combined.push(result);
      seenFiles[fileId] = true;
    }
  }
  
  // Step 2: Add text results that aren't already included - from right_now.md
  const textResults = allResults.filter(r => r.source === 'text');
  for (const { result } of textResults) {
    const fileId = result.id || result.dropbox_path;
    if (fileId && !seenFiles[fileId]) {
      result.source = 'text';
      combined.push(result);
      seenFiles[fileId] = true;
    }
  }
  
  // Step 3: Sort by similarity score (descending) - from right_now.md
  combined.sort((a, b) => (b.composite_score || b.similarity) - (a.composite_score || a.similarity));
  
  return combined;
}

/**
 * Preprocess query for better CLIP embeddings
 */
function preprocessQuery(query: string): string {
  let processedQuery = query.trim().toLowerCase();
  
  // Add descriptive context for better embeddings
  const contextMap: Record<string, string> = {
    'dog': 'a photo of a dog',
    'cat': 'a photo of a cat',
    'sunset': 'a sunset scene with orange and pink sky',
    'beach': 'a beach scene with sand and water',
    'mountain': 'a mountain landscape',
    'forest': 'a forest with trees',
    'city': 'a cityscape or urban scene',
    'food': 'a photo of food or meal',
    'car': 'a photo of a car or vehicle',
    'building': 'a building or architecture',
    'people': 'people or person in a photo',
    'water': 'water scene like lake, river or ocean',
    'flower': 'flowers or flowering plants',
    'sky': 'sky with clouds',
    'snow': 'snowy scene or winter landscape'
  };
  
  // Check if query is a single word that could benefit from context
  const words = processedQuery.split(/\s+/);
  if (words.length === 1 && contextMap[processedQuery]) {
    processedQuery = contextMap[processedQuery];
    console.log(`🔍 Enhanced query: "${query}" → "${processedQuery}"`);
  }
  
  return processedQuery;
}

/**
 * Advanced vector search with re-ranking for better results
 */
export async function advancedSearchVectors(params: SearchParams): Promise<SearchResult[]> {
  const startTime = Date.now();
  const { query, className = 'DropboxFile', limit = CONFIG.performance.default_limit, offset = 0 } = params;
  const client = getWeaviateClient();

  try {
    if (!query?.trim()) return [];
    
    // Preprocess query for better embeddings
    const processedQuery = preprocessQuery(query);
    
    console.log(`🎯 Starting vector search with re-ranking for: "${query}"`);
    
    // Get 200 results for re-ranking
    const vectorResults = await performVectorSearch(
      client, 
      processedQuery,  // Use processed query
      className, 
      CONFIG.vector_search.initial_retrieval_limit, // Get 200 results
      0.7, // certainty not used with distance threshold
      offset
    );
    
    console.log(`📊 Vector search retrieved ${vectorResults.length} candidates`);
    
    // Add detailed logging for score analysis
    if (vectorResults.length > 0) {
      const scores = vectorResults.map(r => r.similarity || 0);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      
      console.log(`📈 Score distribution: min=${minScore.toFixed(3)}, max=${maxScore.toFixed(3)}, avg=${avgScore.toFixed(3)}`);
      console.log(`🔍 Top 5 scores: ${scores.slice(0, 5).map(s => s.toFixed(3)).join(', ')}`);
    }
    
    // Re-ranking with multiple factors
    const rerankedResults = vectorResults.map(result => {
      const baseScore = result.similarity || 0;
      let rerankedScore = baseScore;
      
      // Caption quality boost - longer, more descriptive captions often mean better embeddings
      const caption = result.caption || '';
      if (caption.length > 50) {
        rerankedScore *= 1.15; // 15% boost for detailed captions
      } else if (caption.length > 20) {
        rerankedScore *= 1.05; // 5% boost for decent captions
      }
      
      // File size boost - larger files often better quality
      const fileSize = result.file_size || 0;
      if (fileSize > 2000000) { // >2MB
        rerankedScore *= 1.1;
      } else if (fileSize < 100000) { // <100KB, might be low quality
        rerankedScore *= 0.95;
      }
      
      // Tag boost - files with more tags often better organized/quality
      const tagCount = result.tags?.length || 0;
      if (tagCount > 3) {
        rerankedScore *= 1.05;
      }
      
      return {
        ...result,
        reranked_score: rerankedScore,
        original_score: baseScore
      };
    });
    
    // Filter and sort by re-ranked score
    const finalResults = rerankedResults
      .filter(result => {
        const score = result.original_score || 0;
        return score >= CONFIG.vector_search.min_similarity_score;
      })
      .sort((a, b) => (b.reranked_score || 0) - (a.reranked_score || 0))
      .slice(0, limit)
      .map(result => ({
        ...result,
        similarity: result.reranked_score // Use re-ranked score as final similarity
      }));
    
    const processingTime = Date.now() - startTime;
    console.log(`✨ Vector search with re-ranking completed in ${processingTime}ms`);
    console.log(`🎯 Returning ${finalResults.length} results (filtered from ${vectorResults.length} candidates)`);
    
    if (finalResults.length > 0) {
      const finalScores = finalResults.map(r => r.similarity || 0);
      console.log(`🏆 Final top 3 scores: ${finalScores.slice(0, 3).map(s => s.toFixed(3)).join(', ')}`);
    }
    
    return finalResults;

  } catch (error) {
    console.error('[WEAVIATE] Error in vector search:', error);
    return [];
  }
}

/**
 * Current system dual search strategy (from right_now.md)
 */
export async function searchVectors(params: SearchParams): Promise<SearchResult[]> {
  // Always use vector-only search for smart search
  if (params.useAdvanced) {
    return advancedSearchVectors(params);
  }
  
  // Fallback: use vector search only
  const startTime = Date.now();
  const { query, className = 'DropboxFile', limit = CONFIG.performance.default_limit, offset = 0, certainty = 0.7 } = params;
  const client = getWeaviateClient();

  try {
    console.log(`🔍 Starting dual search for: "${query}" (limit: ${limit}, offset: ${offset})`);
    
    let allResults: Array<{source: string, result: SearchResult}> = [];

    // 1. VECTOR SIMILARITY SEARCH (current system from right_now.md)
    try {
      console.log('📊 Attempting vector similarity search...');
      const vectorResults = await performVectorSearch(client, query, className, limit, certainty, offset);
      allResults.push(...vectorResults.map(result => ({
        source: 'vector',
        result: { ...result, source: 'vector' as const }
      })));
      console.log(`[WEAVIATE] Vector search found ${vectorResults.length} results`);
    } catch (error) {
      console.log('⚠️ Vector search not available, falling back to text search');
    }

    // 2. TEXT SEARCH (current system from right_now.md)
    try {
      console.log('📝 Performing text search...');
      const textResults = await performTextSearch(client, query, className, limit, offset);
      allResults.push(...textResults.map(result => ({
        source: 'text', 
        result: { ...result, source: 'text' as const }
      })));
      console.log(`[WEAVIATE] Text search found ${textResults.length} results`);
    } catch (error) {
      console.log('❌ Text search failed:', error);
    }

    // 3. DEDUPLICATION & INTELLIGENT RANKING (current system from right_now.md)
    const uniqueResults = deduplicateAndRankResults(allResults);
    
    const processingTime = Date.now() - startTime;
    console.log(`🎯 Search completed in ${processingTime}ms, returning ${uniqueResults.length} unique results`);
    
    return uniqueResults;

  } catch (error) {
    console.error('[WEAVIATE] Error in dual search:', error);
    throw new Error('Failed to search vectors');
  }
}

export async function fallbackSearch(params: SearchParams): Promise<SearchResult[]> {
  const { query, className = 'DropboxFile', limit = CONFIG.performance.default_limit, offset = 0 } = params;
  const client = getWeaviateClient();

  try {
    console.log('🔄 Performing fallback text-only search...');
    return await performTextSearch(client, query, className, limit, offset);
  } catch (error) {
    console.error('[WEAVIATE] Fallback search failed:', error);
    return [];
  }
}

export async function searchByImageVector(
  imageVector: number[],
  params: Omit<SearchParams, 'query'>
): Promise<SearchResult[]> {
  const { className = 'DropboxFile', limit = CONFIG.performance.default_limit, offset = 0, certainty = 0.7 } = params;
  const client = getWeaviateClient();

  try {
    console.log('🖼️ Performing image vector search...');
    
    const properties = [
      'dropbox_path', 'file_name', 'file_type', 'file_size',
      'caption', 'tags', 'modified_date', 'public_url', 'thumbnail_url'
    ];

    const response = await client.graphql
      .get()
      .withClassName(className)
      .withFields(`${properties.join(' ')} _additional { distance id }`)
      .withNearVector({
        vector: imageVector,
        distance: CONFIG.vector_search.distance_threshold
      })
      .withLimit(limit)
      .withOffset(offset)
      .do();

    const files = response?.data?.Get?.[className] || [];
    
    return files.map((file: any) => {
      const distance = file._additional?.distance || 1.0;
      const similarity = Math.max(0.0, Math.min(1.0, 1.0 - distance));
      
      return {
        id: file._additional?.id || '',
        dropbox_path: file.dropbox_path || '',
        file_name: file.file_name,
        caption: file.caption,
        tags: file.tags || [],
        similarity,
        public_url: file.public_url,
        thumbnail_url: file.thumbnail_url,
        file_type: file.file_type,
        file_size: file.file_size,
        source: 'vector' as const,
        metadata: {
          distance,
          weaviate_id: file._additional?.id
        }
      };
    });

  } catch (error) {
    console.error('[WEAVIATE] Image vector search failed:', error);
    return [];
  }
} 