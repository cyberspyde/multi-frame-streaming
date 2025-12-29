#!/usr/bin/env ts-node

/**
 * Performance Report Generator
 * Creates detailed performance reports with charts and analysis
 */

import { performanceMonitor } from '../lib/performance-monitor'
import * as fs from 'fs'
import * as path from 'path'

interface PerformanceReport {
  timestamp: string
  totalQueries: number
  averageDuration: number
  cacheHitRate: number
  slowQueries: number
  errors: number
  p95Duration: number
  queryBreakdown: QueryBreakdown[]
  recommendations: string[]
}

interface QueryBreakdown {
  queryType: string
  count: number
  avgDuration: number
  minDuration: number
  maxDuration: number
  p95Duration: number
}

class PerformanceReportGenerator {
  private readonly reportsDir = path.join(process.cwd(), 'performance-reports')

  constructor() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true })
    }
  }

  generateReport(): PerformanceReport {
    const stats = performanceMonitor.getStats()
    const timestamp = new Date().toISOString()

    // Get query breakdown
    const queryBreakdown = this.getQueryBreakdown()

    // Generate recommendations
    const recommendations = this.generateRecommendations(stats, queryBreakdown)

    const report: PerformanceReport = {
      timestamp,
      totalQueries: stats.totalQueries,
      averageDuration: stats.averageDuration,
      cacheHitRate: stats.cacheHitRate,
      slowQueries: stats.slowQueries,
      errors: stats.errors,
      p95Duration: stats.p95Duration,
      queryBreakdown,
      recommendations
    }

    return report
  }

  saveReport(report: PerformanceReport, filename?: string): string {
    const fileName = filename || `performance-report-${Date.now()}.json`
    const filePath = path.join(this.reportsDir, fileName)
    
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2))
    console.log(`📄 Report saved to: ${filePath}`)
    
    return filePath
  }

  generateHTMLReport(report: PerformanceReport): string {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Performance Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; background: #f6f8fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #24292e; border-bottom: 3px solid #0366d6; padding-bottom: 10px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric-card { background: #f6f8fa; padding: 20px; border-radius: 6px; border-left: 4px solid #0366d6; }
        .metric-value { font-size: 24px; font-weight: bold; color: #24292e; }
        .metric-label { color: #656d76; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .section { margin: 30px 0; }
        .section h2 { color: #24292e; border-bottom: 2px solid #e1e4e8; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e1e4e8; }
        th { background: #f6f8fa; font-weight: 600; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 6px; }
        .recommendations ul { margin: 0; padding-left: 20px; }
        .footer { margin-top: 40px; color: #656d76; font-size: 12px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Database Performance Report</h1>
        <p><strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
        
        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-value">${report.totalQueries}</div>
                <div class="metric-label">Total Queries</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.averageDuration}ms</div>
                <div class="metric-label">Average Duration</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.cacheHitRate}%</div>
                <div class="metric-label">Cache Hit Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.slowQueries}</div>
                <div class="metric-label">Slow Queries</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.errors}</div>
                <div class="metric-label">Errors</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.p95Duration}ms</div>
                <div class="metric-label">P95 Duration</div>
            </div>
        </div>

        <div class="section">
            <h2>Query Breakdown</h2>
            <table>
                <thead>
                    <tr>
                        <th>Query Type</th>
                        <th>Count</th>
                        <th>Avg Duration</th>
                        <th>Min Duration</th>
                        <th>Max Duration</th>
                        <th>P95 Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.queryBreakdown.map(qb => `
                        <tr>
                            <td><strong>${qb.queryType}</strong></td>
                            <td>${qb.count}</td>
                            <td>${qb.avgDuration}ms</td>
                            <td>${qb.minDuration}ms</td>
                            <td>${qb.maxDuration}ms</td>
                            <td>${qb.p95Duration}ms</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>Recommendations</h2>
            <div class="recommendations">
                <ul>
                    ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        </div>

        <div class="footer">
            Generated by Multi-Frame Streaming Performance Monitor
        </div>
    </div>
</body>
</html>
    `

    const htmlFileName = `performance-report-${Date.now()}.html`
    const htmlPath = path.join(this.reportsDir, htmlFileName)
    
    fs.writeFileSync(htmlPath, html)
    console.log(`📄 HTML report saved to: ${htmlPath}`)
    
    return htmlPath
  }

  private getQueryBreakdown(): QueryBreakdown[] {
    // This would need to be implemented based on your performance monitor
    // For now, return a mock structure
    return [
      {
        queryType: 'random',
        count: 50,
        avgDuration: 150,
        minDuration: 50,
        maxDuration: 500,
        p95Duration: 300
      },
      {
        queryType: 'count',
        count: 30,
        avgDuration: 200,
        minDuration: 100,
        maxDuration: 800,
        p95Duration: 600
      },
      {
        queryType: 'pagination',
        count: 100,
        avgDuration: 80,
        minDuration: 20,
        maxDuration: 200,
        p95Duration: 150
      }
    ]
  }

  private generateRecommendations(stats: any, breakdown: QueryBreakdown[]): string[] {
    const recommendations: string[] = []

    if (stats.averageDuration > 1000) {
      recommendations.push('⚠️ Average query duration is high. Consider optimizing slow queries.')
    }

    if (stats.cacheHitRate < 50) {
      recommendations.push('⚠️ Low cache hit rate. Review caching strategy for frequently accessed data.')
    }

    if (stats.slowQueries > 10) {
      recommendations.push('⚠️ High number of slow queries. Implement query optimization.')
    }

    if (stats.errors > 0) {
      recommendations.push(`⚠️ ${stats.errors} query errors detected. Check error logs and implement better error handling.`)
    }

    const slowestQuery = breakdown.reduce((slowest, current) => 
      current.avgDuration > (slowest?.avgDuration || 0) ? current : slowest
    )

    if (slowestQuery && slowestQuery.avgDuration > 500) {
      recommendations.push(`🎯 Focus optimization efforts on ${slowestQuery.queryType} queries (avg: ${slowestQuery.avgDuration}ms).`)
    }

    if (stats.cacheHitRate > 80) {
      recommendations.push('✅ Excellent cache hit rate! Consider expanding cache strategy.')
    }

    if (stats.averageDuration < 100) {
      recommendations.push('✅ Query performance is excellent. Maintain current optimization efforts.')
    }

    return recommendations.length > 0 ? recommendations : ['✅ All metrics look good! No immediate action required.']
  }

  listReports(): string[] {
    try {
      return fs.readdirSync(this.reportsDir)
        .filter(file => file.endsWith('.json') || file.endsWith('.html'))
        .sort()
        .reverse()
    } catch {
      return []
    }
  }

  loadReport(filename: string): PerformanceReport | null {
    const filePath = path.join(this.reportsDir, filename)
    
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      console.error(`❌ Failed to load report ${filename}:`, error)
      return null
    }
  }
}

// CLI interface
if (require.main === module) {
  const generator = new PerformanceReportGenerator()
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'generate':
      const report = generator.generateReport()
      const jsonPath = generator.saveReport(report)
      const htmlPath = generator.generateHTMLReport(report)
      console.log(`✅ Report generated successfully!`)
      break

    case 'list':
      const reports = generator.listReports()
      console.log('📄 Available Reports:')
      reports.forEach(report => console.log(`  - ${report}`))
      break

    case 'view':
      const filename = args[1]
      if (!filename) {
        console.log('❌ Please provide a filename')
        process.exit(1)
      }
      
      const report = generator.loadReport(filename)
      if (report) {
        console.log(JSON.stringify(report, null, 2))
      }
      break

    default:
      console.log(`
Usage: ts-node scripts/performance-report.ts <command>

Commands:
  generate    Generate a new performance report
  list        List available reports
  view <file> View a specific report

Examples:
  ts-node scripts/performance-report.ts generate
  ts-node scripts/performance-report.ts list
  ts-node scripts/performance-report.ts view performance-report-1234567890.json
      `)
  }
}

export { PerformanceReportGenerator }