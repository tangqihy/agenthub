import { View, Text } from '@tarojs/components'
import AppLayout from '../../components/Layout/AppLayout'
import { Button, Tag } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import { usePolling } from '../../hooks/usePolling'
import { useApiHealth } from '../../hooks/useApiHealth'
import { api } from '../../services/api'
import OfflineBanner from '../../components/OfflineBanner'
import BottomNav from '../../components/BottomNav'
import '../../app.scss'

export default function CronPage() {
  const online = useApiHealth()
  const { data: jobs, refresh } = usePolling(() => api.cronJobs(), 5000)

  const runAction = async (action: 'pause' | 'resume' | 'run' | 'remove', id: string) => {
    if (!online) return
    try {
      if (action === 'pause') await api.cronPause(id)
      else if (action === 'resume') await api.cronResume(id)
      else if (action === 'run') await api.cronRun(id)
      else await api.cronRemove(id)
      Taro.showToast({ title: '已提交', icon: 'success' })
      refresh()
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'error' })
    }
  }

  return (
      <AppLayout>
    <View className='page'>
      {!online && <OfflineBanner />}
      {jobs?.map((job) => (
        <View key={job.id} className='section'>
          <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontWeight: 600 }}>{job.name}</Text>
            <Tag type={job.status === 'active' ? 'success' : 'warning'}>{job.status}</Tag>
          </View>
          <Text style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8 }}>
            {job.schedule}
          </Text>
          <View style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size='small' disabled={!online} onClick={() => runAction('pause', job.id)}>暂停</Button>
            <Button size='small' disabled={!online} onClick={() => runAction('resume', job.id)}>恢复</Button>
            <Button size='small' type='primary' disabled={!online} onClick={() => runAction('run', job.id)}>执行</Button>
            <Button size='small' type='danger' disabled={!online} onClick={() => runAction('remove', job.id)}>删除</Button>
          </View>
        </View>
      ))}
      <BottomNav active='/pages/cron/index' />
    </View>
      </AppLayout>)
}
