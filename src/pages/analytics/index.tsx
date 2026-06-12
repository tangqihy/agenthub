import { View, Text } from '@tarojs/components'
import AppLayout from '../../components/Layout/AppLayout'
import { usePolling } from '../../hooks/usePolling'
import { api } from '../../services/api'
import { formatTokens } from '../../services/types'
import TokenCard from '../../components/TokenCard'
import BottomNav from '../../components/BottomNav'
import '../../app.scss'

export default function AnalyticsPage() {
  const { data: summary } = usePolling(() => api.analyticsSummary(), 10000)
  const { data: bySource } = usePolling(() => api.analyticsBySource(), 10000)
  const { data: byTool } = usePolling(() => api.analyticsByTool(), 10000)
  const { data: byModel } = usePolling(() => api.analyticsByModel(), 10000)
  const { data: daily } = usePolling(() => api.analyticsDaily(), 10000)

  return (
      <AppLayout>
    <View className='page'>
      {summary && (
        <View className='section'>
          <Text className='section__title'>Token 汇总</Text>
          <View className='token-row'>
            <TokenCard label='今日' tokens={summary.today_tokens} cost={summary.today_cost} />
            <TokenCard label='本周' tokens={summary.week_tokens} cost={summary.week_cost} />
            <TokenCard label='本月' tokens={summary.month_tokens} cost={summary.month_cost} />
          </View>
        </View>
      )}

      <View className='section'>
        <Text className='section__title'>按 Source</Text>
        {bySource?.map((item) => (
          <View key={item.source} className='source-row'>
            <Text>{item.source}</Text>
            <Text>{formatTokens(item.tokens)}</Text>
          </View>
        ))}
      </View>

      <View className='section'>
        <Text className='section__title'>工具调用排行</Text>
        {byTool?.map((item) => (
          <View key={item.tool} className='source-row'>
            <Text>{item.tool}</Text>
            <Text>{item.calls} 次</Text>
          </View>
        ))}
      </View>

      <View className='section'>
        <Text className='section__title'>按 Model</Text>
        {byModel?.map((item) => (
          <View key={item.model} className='source-row'>
            <Text>{item.model}</Text>
            <Text>{formatTokens(item.tokens)}</Text>
          </View>
        ))}
      </View>

      <View className='section'>
        <Text className='section__title'>按日 (usage_daily)</Text>
        {daily?.slice(0, 14).map((row) => (
          <View key={`${row.date}-${row.source}-${row.model}`} className='source-row'>
            <Text>{row.date} · {row.source}</Text>
            <Text>{formatTokens(row.input_tokens + row.output_tokens)}</Text>
          </View>
        ))}
      </View>

      <BottomNav active='/pages/analytics/index' />
    </View>
      </AppLayout>)
}
