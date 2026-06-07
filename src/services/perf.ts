/**
 * AgentHub Performance Profiler
 * Tracks page load times, API latency, component render times.
 * Usage:
 *   import { perf } from '../services/perf'
 *   perf.mark('dashboard:load:start')
 *   // ... do work ...
 *   perf.mark('dashboard:load:end')
 *   perf.measure('dashboard:load', 'dashboard:load:start', 'dashboard:load:end')
 *   perf.report() // prints summary
 */

interface PerfEntry {
  name: string
  duration: number
  timestamp: number
  type: 'page' | 'api' | 'component' | 'navigation'
}

class PerfProfiler {
  private marks: Map<string, number> = new Map()
  private measures: PerfEntry[] = []
  private apiTimings: Map<string, number[]> = new Map()
  private enabled: boolean = true

  mark(name: string) {
    if (!this.enabled) return
    this.marks.set(name, performance.now())
  }

  measure(name: string, startMark: string, endMark: string, type: PerfEntry['type'] = 'page') {
    if (!this.enabled) return
    const start = this.marks.get(startMark)
    const end = this.marks.get(endMark)
    if (start === undefined || end === undefined) return
    const entry: PerfEntry = {
      name,
      duration: end - start,
      timestamp: Date.now(),
      type,
    }
    this.measures.push(entry)
    // Warn if slow
    if (entry.duration > 1000) {
      console.warn(`[Perf] SLOW ${type}: ${name} took ${entry.duration.toFixed(0)}ms`)
    }
    return entry
  }

  // Track API call duration
  trackApi(url: string, duration: number) {
    if (!this.enabled) return
    const key = url.split('?')[0] // strip query params
    if (!this.apiTimings.has(key)) this.apiTimings.set(key, [])
    this.apiTimings.get(key)!.push(duration)
    if (duration > 500) {
      console.warn(`[Perf] SLOW API: ${key} took ${duration.toFixed(0)}ms`)
    }
  }

  // Get summary
  getSummary() {
    const byType: Record<string, PerfEntry[]> = { page: [], api: [], component: [], navigation: [] }
    for (const m of this.measures) {
      byType[m.type].push(m)
    }
    const apiSummary: Record<string, { avg: number; max: number; count: number }> = {}
    for (const [url, timings] of this.apiTimings) {
      apiSummary[url] = {
        avg: timings.reduce((a, b) => a + b, 0) / timings.length,
        max: Math.max(...timings),
        count: timings.length,
      }
    }
    return {
      pages: byType.page.map(m => ({ name: m.name, duration: m.duration })),
      components: byType.component.map(m => ({ name: m.name, duration: m.duration })),
      apis: apiSummary,
      totalMeasures: this.measures.length,
    }
  }

  // Print summary to console
  report() {
    const summary = this.getSummary()
    console.group('[Perf Report]')
    console.table(summary.pages)
    console.table(summary.components)
    console.table(summary.apis)
    console.log('Total measures:', summary.totalMeasures)
    console.groupEnd()
    return summary
  }

  // Check if any performance threshold is exceeded
  checkThresholds(): { passed: boolean; violations: string[] } {
    const violations: string[] = []
    const summary = this.getSummary()
    for (const p of summary.pages) {
      if (p.duration > 2000) violations.push(`Page ${p.name}: ${p.duration.toFixed(0)}ms (threshold: 2000ms)`)
    }
    for (const [url, stats] of Object.entries(summary.apis)) {
      if (stats.avg > 500) violations.push(`API ${url}: avg ${stats.avg.toFixed(0)}ms (threshold: 500ms)`)
      if (stats.max > 3000) violations.push(`API ${url}: max ${stats.max.toFixed(0)}ms (threshold: 3000ms)`)
    }
    return { passed: violations.length === 0, violations }
  }

  reset() {
    this.marks.clear()
    this.measures = []
    this.apiTimings.clear()
  }

  setEnabled(v: boolean) { this.enabled = v }
}

export const perf = new PerfProfiler()
