import { NextRequest, NextResponse } from 'next/server';
import { SearchPerformanceTester, quickPerformanceTest, benchmarkConcurrency } from '@/lib/performance-testing';

interface PerformanceTestRequest {
  query: string;
  engines?: Array<'vector' | 'dropbox' | 'hybrid'>;
  test_type?: 'ab' | 'concurrency' | 'single';
  max_results?: number;
  iterations?: number;
  concurrency_levels?: number[];
}

export async function POST(request: NextRequest) {
  try {
    const body: PerformanceTestRequest = await request.json();
    const { 
      query, 
      engines = ['vector', 'dropbox', 'hybrid'],
      test_type = 'ab',
      max_results = 25,
      iterations = 2,
      concurrency_levels = [10, 20, 25, 30]
    } = body;

    if (!query?.trim()) {
      return NextResponse.json({
        error: 'Query is required for performance testing'
      }, { status: 400 });
    }

    console.log(`🧪 Performance test requested: ${test_type} for "${query}"`);

    switch (test_type) {
      case 'ab': {
        const result = await quickPerformanceTest(query);
        return NextResponse.json({
          test_type: 'ab',
          result,
          timestamp: new Date().toISOString()
        });
      }

      case 'concurrency': {
        const results = await benchmarkConcurrency(query, concurrency_levels);
        return NextResponse.json({
          test_type: 'concurrency',
          query,
          results,
          optimal: results
            .filter(r => r.success_rate > 90)
            .sort((a, b) => a.time - b.time)[0],
          timestamp: new Date().toISOString()
        });
      }

      case 'single': {
        const tester = new SearchPerformanceTester();
        const engine = engines[0] || 'hybrid';
        
        const metrics = await tester.testSearchEngine(engine, query, {
          max_results,
          iterations
        });
        
        return NextResponse.json({
          test_type: 'single',
          engine,
          metrics,
          timestamp: new Date().toISOString()
        });
      }

      default:
        return NextResponse.json({
          error: `Unknown test type: ${test_type}`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[PERF] Performance test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Performance test failed'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || 'farm';
  const testType = (searchParams.get('type') as 'ab' | 'concurrency' | 'single') || 'ab';

  // Convert GET to POST format
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ 
      query,
      test_type: testType,
      max_results: 25,
      iterations: 2
    }),
    headers: { 'Content-Type': 'application/json' }
  }));
}