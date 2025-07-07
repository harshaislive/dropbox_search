/**
 * Advanced Vector Search Configuration
 * Based on current system architecture (right_now.md) and enhancements (plan.md)
 */

export const SEARCH_CONFIG = {
  // Vector search settings from right_now.md (optimized values)
  vector_search: {
    distance_threshold: 1.5,  // Optimized for your 13,875 files dataset
    initial_limit_multiplier: 3,  // Get 3x results for advanced filtering
    min_similarity_score: 0.3,
    clip_api_url: 'https://clipserver-production.up.railway.app',
    vector_dimensions: 512  // CLIP standard
  },

  // Current system text relevance weights from right_now.md
  text_relevance_weights: {
    caption: 0.6,    // Highest weight - Azure Vision captions
    filename: 0.3,   // Medium weight - file names
    path: 0.1        // Lower weight - folder paths
  },

  // Advanced composite scoring weights from plan.md
  scoring_weights: {
    vector_similarity: 0.6,  // Primary semantic understanding
    text_relevance: 0.3,     // Exact text matches
    tag_relevance: 0.1       // Tag-based relevance
  },

  // Quality assessment thresholds from plan.md
  quality_thresholds: {
    high_quality_size: 5000000,    // 5MB+ files
    medium_quality_size: 2000000,  // 2MB+ files
    min_caption_length: 20,        // Meaningful captions
    min_tags_for_boost: 2          // Rich metadata
  },

  // Boosting factors from plan.md
  boosting_factors: {
    path_relevance: 1.1,      // Folder name matches query
    recent_file: 1.1,         // Files modified in last 30 days
    high_quality: 1.2,        // Large, high-quality files
    seasonal_relevance: 1.15, // Seasonal content matching
    organized_folder: 1.05    // Files in /photos/, /images/ folders
  },

  // Result diversification from plan.md
  diversity: {
    similarity_threshold: 0.8,  // Avoid too similar results
    diversity_factor: 0.3,      // 30% diversity requirement
    min_guaranteed_results: 3   // Always include top 3 results
  },

  // Current system schema properties from right_now.md
  weaviate_schema: {
    class_name: 'DropboxFile',
    properties: [
      'dropbox_path',
      'file_name', 
      'file_type',
      'file_extension',
      'file_size',
      'caption',
      'tags',
      'modified_date',
      'processed_date',
      'content_hash',
      'public_url',
      'thumbnail_url'
    ]
  },

  // Performance settings
  performance: {
    default_limit: 120,         // Total results per query
    results_per_page: 21,       // 21 results per page (3x7 grid)
    max_query_variations: 3,    // Limit query expansion for performance
    batch_processing_size: 21,  // Concurrent API calls for 21 results per page
    concurrent_url_generation: 21, // Generate URLs for 21 results concurrently
    cache_ttl: 300000          // 5 minutes cache for popular queries
  }
};

// Query expansion dictionary from plan.md
export const QUERY_EXPANSIONS: Record<string, string[]> = {
  'sunset': ['golden hour', 'dusk', 'evening light', 'orange sky', 'twilight'],
  'mountain': ['peak', 'hill', 'landscape', 'scenic view', 'summit'],
  'water': ['river', 'lake', 'ocean', 'stream', 'waterfall', 'sea'],
  'people': ['person', 'human', 'portrait', 'group', 'individuals'],
  'building': ['architecture', 'structure', 'house', 'construction', 'edifice'],
  'nature': ['landscape', 'outdoor', 'natural', 'wilderness', 'environment'],
  'forest': ['woods', 'trees', 'woodland', 'jungle', 'grove'],
  'beach': ['shore', 'coast', 'seaside', 'oceanfront', 'waterfront'],
  'city': ['urban', 'downtown', 'metropolitan', 'cityscape', 'street'],
  'farm': ['agriculture', 'farming', 'rural', 'countryside', 'agricultural'],
  'collective': ['group', 'community', 'gathering', 'assembly', 'organization']
};

// Search strategy types
export type SearchStrategy = 
  | 'advanced_multi_stage'
  | 'dual_search'
  | 'fallback_search'
  | 'fallback_only'
  | 'vector_only'
  | 'text_only';

// Search source types
export type SearchSource = 'vector' | 'text' | 'hybrid' | 'unknown';

// Performance monitoring
export interface SearchMetrics {
  total_searches: number;
  average_response_time: number;
  vector_search_success_rate: number;
  text_search_success_rate: number;
  user_satisfaction_rate?: number;
  popular_queries: string[];
}

// Current system statistics from right_now.md
export const SYSTEM_STATS = {
  total_files: 13875,
  vector_coverage: 1.0,  // 100% coverage
  vector_dimensions: 512,
  image_files: 13872,
  video_files: 3,
  optimized_distance_threshold: 1.5,
  average_response_time_ms: 1500  // 1-2 seconds
};

export default SEARCH_CONFIG; 