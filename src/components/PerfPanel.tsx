import { View, Text } from '@tarojs/components'
import { useState } from 'react'
import { perf } from '../services/perf'
import './PerfPanel.scss'

export default function PerfPanel() {
  const [expanded, setExpanded] = useState(false)
  const [report, setReport] = useState<ReturnType<typeof perf.getSummary> | null>(null)

  // Only show in development
  if (process.env.NODE_ENV === 'production') return null

  const handleRefresh = () => {
    setReport(perf.getSummary())
  }

  const handleCheck = () => {
    const result = perf.checkThresholds()
    if (result.passed) {
      alert('✅ All performance checks passed!')
    } else {
      alert('❌ Performance violations:\n' + result.violations.join('\n'))
    }
  }

  return (
    <View className='perf-panel'>
      <View className='perf-panel__toggle' onClick={() => { setExpanded(!expanded); if (!expanded) handleRefresh() }}>
        <Text className='perf-panel__toggle-text'>⚡ Perf</Text>
      </View>
      {expanded && report && (
        <View className='perf-panel__content'>
          <Text className='perf-panel__title'>Performance Report</Text>
          <Text className='perf-panel__section'>API Calls:</Text>
          {Object.entries(report.apis).map(([url, stats]) => (
            <Text key={url} className='perf-panel__item'>
              {url}: avg {stats.avg.toFixed(0)}ms ({stats.count}x)
            </Text>
          ))}
          <View className='perf-panel__actions'>
            <View className='perf-panel__btn' onClick={handleRefresh}><Text>Refresh</Text></View>
            <View className='perf-panel__btn perf-panel__btn--primary' onClick={handleCheck}><Text>Check</Text></View>
          </View>
        </View>
      )}
    </View>
  )
}
