import { hybridSearch } from './hybrid-search';
import { searchVectors, advancedSearchVectors } from './weaviate';
import { searchMediaWithThumbnails } from './dropbox';

export interface PerformanceMetrics {
  search_engine: 'vector' | 'dropbox' | 'hybrid';
  query: string;
  total_results: number;
  processing_time: number;
  first_result_time: number;
  thumbnail_load_time: number;
  success_rate: number;
  error_count: number;
  memory_usage?: number;
  timestamp: string;
}

export interface ABTestResult {
  test_id: string;
  query: string;
  engines_tested: string[];
  results: PerformanceMetrics[];
  winner: {
    engine: string;
    reason: string;
    improvement_percentage: number;
  };
  recommendations: string[];
}

/**
 * Performance testing utility for different search engines
 */
export class SearchPerformanceTester {
  private metrics: PerformanceMetrics[] = [];
  
  /**
   * Test a single search engine with performance monitoring
   */
  async testSearchEngine(
    engine: 'vector' | 'dropbox' | 'hybrid',
    query: string,
    options: { max_results?: number; iterations?: number } = {}
  ): Promise<PerformanceMetrics> {
    const { max_results = 50, iterations = 1 } = options;
    const startTime = Date.now();
    
    console.log(`🧪 Testing ${engine} search for "${query}" (${iterations} iterations)`);
    
    let totalTime = 0;
    let totalResults = 0;
    let errorCount = 0;
    let firstResultTime = 0;
    let thumbnailLoadTime = 0;
    
    for (let i = 0; i < iterations; i++) {
      const iterationStart = Date.now();
      
      try {
        let searchResult: any;
        
        switch (engine) {
          case 'vector':
            searchResult = await advancedSearchVectors({
              query,
              className: 'DropboxFile',
              limit: max_results,
              offset: 0,
              certainty: 0.7,
              useAdvanced: true
            });
            break;
            
          case 'dropbox':
            const dropboxStart = Date.now();
            searchResult = await searchMediaWithThumbnails(query, {
              max_results,
              maxConcurrency: 25,
              useOptimized: true
            });
            thumbnailLoadTime = Date.now() - dropboxStart;
            searchResult = { files: searchResult.files };
            break;
            
          case 'hybrid':
            const hybridResult = await hybridSearch({
              query,
              max_results,
              search_mode: 'hybrid'
            });
            searchResult = { files: hybridResult.files };
            break;
            
          default:
            throw new Error(`Unknown engine: ${engine}`);
        }
        
        const iterationTime = Date.now() - iterationStart;
        totalTime += iterationTime;
        totalResults += Array.isArray(searchResult) ? searchResult.length : searchResult.files?.length || 0;
        
        if (i === 0) {
          firstResultTime = iterationTime;
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error in ${engine} search iteration ${i + 1}:`, error);
      }
    }
    
    const avgTime = totalTime / iterations;
    const avgResults = totalResults / iterations;
    const successRate = ((iterations - errorCount) / iterations) * 100;
    
    const metrics: PerformanceMetrics = {
      search_engine: engine,
      query,
      total_results: Math.round(avgResults),
      processing_time: Math.round(avgTime),
      first_result_time: firstResultTime,
      thumbnail_load_time: thumbnailLoadTime,
      success_rate: successRate,
      error_count: errorCount,
      timestamp: new Date().toISOString()
    };
    
    this.metrics.push(metrics);
    
    console.log(`📊 ${engine} Results: ${avgTime.toFixed(0)}ms avg, ${avgResults.toFixed(0)} results, ${successRate.toFixed(1)}% success`);
    
    return metrics;
  }
  
  /**
   * Run A/B test comparing multiple search engines
   */
  async runABTest(
    query: string,
    engines: Array<'vector' | 'dropbox' | 'hybrid'> = ['vector', 'dropbox', 'hybrid'],
    options: { max_results?: number; iterations?: number } = {}
  ): Promise<ABTestResult> {
    const testId = `ab_test_${Date.now()}`;
    const { max_results = 50, iterations = 3 } = options;
    
    console.log(`🔬 Starting A/B test: "${query}" with engines: ${engines.join(', ')}`);
    
    const results: PerformanceMetrics[] = [];
    
    // Test each engine
    for (const engine of engines) {
      try {
        const metrics = await this.testSearchEngine(engine, query, { max_results, iterations });
        results.push(metrics);
      } catch (error) {
        console.error(`❌ Failed to test ${engine}:`, error);
      }
    }
    
    // Analyze results and determine winner
    const winner = this.analyzeResults(results);
    const recommendations = this.generateRecommendations(results);
    
    const abTestResult: ABTestResult = {
      test_id: testId,
      query,
      engines_tested: engines,
      results,
      winner,
      recommendations
    };
    
    console.log(`🏆 A/B Test Winner: ${winner.engine} (${winner.improvement_percentage.toFixed(1)}% better)`);
    console.log(`💡 Reason: ${winner.reason}`);
    
    return abTestResult;
  }
  
  /**
   * Analyze test results to determine the best performing engine
   */
  private analyzeResults(results: PerformanceMetrics[]): ABTestResult['winner'] {
    if (results.length === 0) {
      return { engine: 'none', reason: 'No valid results', improvement_percentage: 0 };
    }
    
    // Sort by composite score (considering speed, success rate, and result count)
    const scored = results.map(result => {
      const speedScore = 1000 / (result.processing_time + 1); // Higher is better
      const successScore = result.success_rate; // 0-100
      const resultScore = Math.min(result.total_results, 50); // Cap at 50
      
      const compositeScore = (speedScore * 0.4) + (successScore * 0.4) + (resultScore * 0.2);
      
      return { ...result, compositeScore };
    }).sort((a, b) => b.compositeScore - a.compositeScore);
    
    const winner = scored[0];
    const runner_up = scored[1];
    
    const improvement = runner_up 
      ? ((winner.compositeScore - runner_up.compositeScore) / runner_up.compositeScore) * 100
      : 0;
    
    let reason = '';
    if (winner.processing_time < 2000 && winner.success_rate > 90) {
      reason = 'Excellent speed and reliability';
    } else if (winner.success_rate === 100) {
      reason = 'Perfect reliability';
    } else if (winner.processing_time < 1000) {
      reason = 'Fastest response time';
    } else if (winner.total_results > (runner_up?.total_results || 0)) {
      reason = 'Best result quantity';
    } else {
      reason = 'Best overall performance';
    }
    
    return {
      engine: winner.search_engine,
      reason,
      improvement_percentage: improvement
    };
  }
  
  /**
   * Generate performance recommendations based on test results
   */
  private generateRecommendations(results: PerformanceMetrics[]): string[] {
    const recommendations: string[] = [];
    
    const avgProcessingTime = results.reduce((sum, r) => sum + r.processing_time, 0) / results.length;
    const avgSuccessRate = results.reduce((sum, r) => sum + r.success_rate, 0) / results.length;
    
    if (avgProcessingTime > 3000) {
      recommendations.push('Consider increasing concurrency limits for better performance');
    }
    
    if (avgSuccessRate < 95) {
      recommendations.push('Implement better error handling and retry mechanisms');
    }
    
    const hybridResult = results.find(r => r.search_engine === 'hybrid');
    const vectorResult = results.find(r => r.search_engine === 'vector');
    const dropboxResult = results.find(r => r.search_engine === 'dropbox');
    
    if (hybridResult && vectorResult && hybridResult.processing_time > vectorResult.processing_time * 1.5) {
      recommendations.push('Hybrid search overhead is significant - consider optimizing merge logic');
    }
    
    if (dropboxResult && dropboxResult.thumbnail_load_time > 2000) {
      recommendations.push('Thumbnail loading is slow - consider implementing caching or reducing batch size');
    }
    
    if (results.some(r => r.total_results < 10)) {
      recommendations.push('Low result counts detected - consider adjusting search parameters or thresholds');
    }
    
    return recommendations;
  }
  
  /**
   * Get performance history
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }
  
  /**
   * Clear performance history
   */
  clearHistory(): void {
    this.metrics = [];
  }
  
  /**
   * Export performance data for analysis
   */
  exportData(): string {
    return JSON.stringify({
      metrics: this.metrics,
      summary: this.generateSummary(),
      timestamp: new Date().toISOString()
    }, null, 2);
  }
  
  /**
   * Generate performance summary
   */
  private generateSummary() {
    if (this.metrics.length === 0) return null;
    
    const byEngine = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.search_engine]) {
        acc[metric.search_engine] = [];
      }
      acc[metric.search_engine].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetrics[]>);
    
    const summary = Object.entries(byEngine).map(([engine, metrics]) => ({
      engine,
      tests_run: metrics.length,
      avg_processing_time: metrics.reduce((sum, m) => sum + m.processing_time, 0) / metrics.length,
      avg_success_rate: metrics.reduce((sum, m) => sum + m.success_rate, 0) / metrics.length,
      avg_results: metrics.reduce((sum, m) => sum + m.total_results, 0) / metrics.length
    }));
    
    return summary;
  }
}

/**
 * Quick performance test utility function
 */
export async function quickPerformanceTest(query: string): Promise<ABTestResult> {
  const tester = new SearchPerformanceTester();
  return tester.runABTest(query, ['vector', 'dropbox', 'hybrid'], {
    max_results: 25,
    iterations: 2
  });
}

/**
 * Benchmark different concurrency levels for optimization
 */
export async function benchmarkConcurrency(
  query: string,
  concurrencyLevels: number[] = [10, 20, 25, 30, 40]
): Promise<{ level: number; time: number; success_rate: number }[]> {
  console.log(`🏁 Benchmarking concurrency levels for "${query}"`);
  
  const results = [];
  
  for (const level of concurrencyLevels) {
    console.log(`Testing concurrency level: ${level}`);
    const startTime = Date.now();
    
    try {
      const searchResult = await searchMediaWithThumbnails(query, {
        max_results: 50,
        maxConcurrency: level,
        useOptimized: true
      });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const successRate = (searchResult.files.filter(f => f.thumbnailUrl || f.downloadUrl).length / searchResult.files.length) * 100;
      
      results.push({
        level,
        time: processingTime,
        success_rate: successRate
      });
      
      console.log(`[PERF] Level ${level}: ${processingTime}ms, ${successRate.toFixed(1)}% success`);
      
    } catch (error) {
      console.error(`❌ Level ${level} failed:`, error);
      results.push({
        level,
        time: Infinity,
        success_rate: 0
      });
    }
  }
  
  // Find optimal level
  const optimal = results
    .filter(r => r.success_rate > 90)
    .sort((a, b) => a.time - b.time)[0];
  
  if (optimal) {
    console.log(`🎯 Optimal concurrency: ${optimal.level} (${optimal.time}ms, ${optimal.success_rate.toFixed(1)}% success)`);
  }
  
  return results;
}