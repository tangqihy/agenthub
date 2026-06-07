export default defineAppConfig({
  pages: [
    'pages/dashboard/index',
    'pages/sessions/index',
    'pages/sessions/detail',
    'pages/cron/index',
    'pages/analytics/index',
    'pages/agents/index',
    'pages/agents/detail',
    'pages/agents/editor',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'AgentHub',
    navigationBarTextStyle: 'black',
  },
})
