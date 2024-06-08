import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

// echarts
import ECharts from 'vue-echarts'
import 'echarts'
app.component('VChart', ECharts)

// 挂载dom
app.mount('#app')
