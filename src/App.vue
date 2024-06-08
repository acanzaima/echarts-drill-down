<script setup lang="ts">
import { onMounted, ref } from 'vue'
import createMapOptions from '@/utils/map'
import levelTreeData from 'province-city-china/dist/level.json'

import type { ECBasicOption } from 'echarts/types/dist/shared.js'
import type { ECElementEvent, ElementEvent } from 'echarts'
import type { MapInfoType, areaType, areaDataType } from './types/index'

const areaTreeData: areaDataType[] = levelTreeData

// 为直辖市港澳台模拟市辖区一级
const specialArea: areaType = {
  110000: { code: '110000', name: '北京市', province: '11', city: '00' },
  120000: { code: '120000', name: '天津市', province: '12', city: '00' },
  310000: { code: '310000', name: '上海市', province: '31', city: '00' },
  500000: { code: '500000', name: '重庆市', province: '50', city: '00' },
  810000: { code: '810000', name: '香港特别行政区', province: '81', city: '00' },
  820000: { code: '820000', name: '澳门特别行政区', province: '82', city: '00' },
  710000: { code: '710000', name: '台湾省', province: '71', city: '00' }
}
for (const province of areaTreeData) {
  if (province.code in specialArea) {
    const areaChild = province.children
    const cityInfo = [{ ...specialArea[province.code], children: areaChild }]
    province.children = cityInfo
  }
  if (Array.isArray(province.children)) {
    for (const city of province.children) {
      city.provinceCode = province.code
    }
  }
}

/** @功能 变量 */
// 当前使用地图信息
const curMapInfo = ref<MapInfoType>({
  mapName: 'china',
  mapNameCN: '国界线',
  mapData: []
})

// 当前地图层级
const curMapLevel = ref(0)

/** @功能 地图配置 */
const options = ref<ECBasicOption>({})
onMounted(() => {
  updateMapOptions()
})

/** @功能 点击事件处理 */
const handleClick = (event: ECElementEvent) => {
  if (curMapLevel.value < 3) {
    curMapLevel.value++
    calcDownMapInfo(event.data)
  } else {
    alert('已经是最底层了')
  }
}

const handleZrClick = (event: ElementEvent) => {
  if (!event.target) {
    if (curMapLevel.value > 0) {
      curMapLevel.value--
      calcUpMapInfo()
    } else {
      alert('已经是最上层了')
    }
  }
}

// 计算地图信息
const calcDownMapInfo = (data?: any) => {
  switch (curMapLevel.value) {
    case 1:
      curMapInfo.value = {
        mapName: 'china-province',
        mapNameCN: '中华人民共和国',
        mapData: mockData(areaTreeData)
      }
      updateMapOptions()
      break
    case 2:
      curMapInfo.value = {
        mapName: data.code,
        mapNameCN: data.name,
        mapData: mockData(data.children)
      }
      updateMapOptions()
      break
    case 3:
      curMapInfo.value = {
        mapName: data.provinceCode + '/' + data.code,
        mapNameCN: data.name,
        mapData: mockData(data.children)
      }
      updateMapOptions()
      break
  }
}

const calcUpMapInfo = () => {
  switch (curMapLevel.value) {
    case 0:
      curMapInfo.value = {
        mapName: 'china',
        mapNameCN: '国界线',
        mapData: []
      }
      updateMapOptions()
      break
    case 1:
      curMapInfo.value = {
        mapName: 'china-province',
        mapNameCN: '中华人民共和国',
        mapData: mockData(areaTreeData)
      }
      updateMapOptions()
      break
    case 2:
      curMapInfo.value = curMapInfo.value = getProvinceInfo()
      updateMapOptions()
      break
  }
}

// 上卷时处理省份信息
const getProvinceInfo = () => {
  const provinceCode = curMapInfo.value.mapName.split('/')[0]
  const province = areaTreeData.find((item) => item.code === provinceCode)
  return {
    mapName: province!.code,
    mapNameCN: province!.name,
    mapData: mockData(province!.children!)
  }
}

// 生成地图配置
const loading = ref(false)
const updateMapOptions = () => {
  loading.value = true
  createMapOptions(curMapInfo.value)
    .then((res) => {
      options.value = res
    })
    .catch((err) => {
      console.error(err)
    })
    .finally(() => {
      loading.value = false
    })
}

// 模拟数据计算
const mockData = (arr: areaDataType[]) => {
  return arr.map((item) => {
    return {
      ...item,
      value: Math.floor(Math.random() * 1000)
    }
  })
}

const toGitPage = () => {
  window.open('https://github.com/acanzaima/echarts-drill-down.git', '_blank')
}
</script>

<template>
  <main class="drill-down-wrap">
    <div class="echarts-instance">
      <v-chart :option="options" autoresize @dblclick="handleClick" @zr:dblclick="handleZrClick" />
    </div>
    <div class="fixed-info">
      <div class="info-title">当前展示区域：{{ curMapInfo.mapNameCN }}</div>
      <div class="tips">双击地图下钻，双击空白区域上卷</div>
      <div class="tips">国界线GeoJson无面（Polygon，MultiPolygon）数据，需要点击边界下钻</div>
    </div>
    <div class="github-link" title="echarts-drill-down">
      <img src="./assets/GitHub.svg" alt="" @click="toGitPage" />
    </div>
    <div class="spinner-container" v-show="loading">
      <div class="dot-spinner">
        <div class="dot-spinner__dot"></div>
        <div class="dot-spinner__dot"></div>
        <div class="dot-spinner__dot"></div>
        <div class="dot-spinner__dot"></div>
        <div class="dot-spinner__dot"></div>
        <div class="dot-spinner__dot"></div>
        <div class="dot-spinner__dot"></div>
        <div class="dot-spinner__dot"></div>
      </div>
      <div class="spinner-text">努力加载中...</div>
    </div>
  </main>
</template>

<style scoped>
.drill-down-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.echarts-instance {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 1rem 0;
}

.fixed-info {
  position: absolute;
  top: 0;
  left: 0;
}

.info-title {
  margin: 10px 0;
  font-size: 16px;
  font-weight: 700;
  color: #777;
}

.tips {
  position: relative;
  font-size: 14px;
  color: #909399;
  margin-left: 10px;
}

.tips::before {
  position: absolute;
  content: '*';
  top: 0;
  left: -10px;
}

.github-link {
  position: absolute;
  top: 0;
  right: 0;
  width: 30px;
  height: 30px;
  cursor: pointer;
  img {
    width: 100%;
  }
}

.spinner-container {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding-top: 30vh;
  background: rgba(255, 255, 255, 0.87);
  z-index: 999;
}

.spinner-text {
  margin: 18px;
  font-size: 20px;
}

.dot-spinner {
  --uib-size: 2.8rem;
  --uib-speed: 0.9s;
  --uib-color: #183153;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: var(--uib-size);
  width: var(--uib-size);
}

.dot-spinner__dot {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 100%;
  width: 100%;
}

.dot-spinner__dot::before {
  content: '';
  height: 20%;
  width: 20%;
  border-radius: 50%;
  background-color: var(--uib-color);
  transform: scale(0);
  opacity: 0.5;
  animation: pulse0112 calc(var(--uib-speed) * 1.111) ease-in-out infinite;
  box-shadow: 0 0 20px rgba(18, 31, 53, 0.3);
}

.dot-spinner__dot:nth-child(2) {
  transform: rotate(45deg);
}

.dot-spinner__dot:nth-child(2)::before {
  animation-delay: calc(var(--uib-speed) * -0.875);
}

.dot-spinner__dot:nth-child(3) {
  transform: rotate(90deg);
}

.dot-spinner__dot:nth-child(3)::before {
  animation-delay: calc(var(--uib-speed) * -0.75);
}

.dot-spinner__dot:nth-child(4) {
  transform: rotate(135deg);
}

.dot-spinner__dot:nth-child(4)::before {
  animation-delay: calc(var(--uib-speed) * -0.625);
}

.dot-spinner__dot:nth-child(5) {
  transform: rotate(180deg);
}

.dot-spinner__dot:nth-child(5)::before {
  animation-delay: calc(var(--uib-speed) * -0.5);
}

.dot-spinner__dot:nth-child(6) {
  transform: rotate(225deg);
}

.dot-spinner__dot:nth-child(6)::before {
  animation-delay: calc(var(--uib-speed) * -0.375);
}

.dot-spinner__dot:nth-child(7) {
  transform: rotate(270deg);
}

.dot-spinner__dot:nth-child(7)::before {
  animation-delay: calc(var(--uib-speed) * -0.25);
}

.dot-spinner__dot:nth-child(8) {
  transform: rotate(315deg);
}

.dot-spinner__dot:nth-child(8)::before {
  animation-delay: calc(var(--uib-speed) * -0.125);
}

@keyframes pulse0112 {
  0%,
  100% {
    transform: scale(0);
    opacity: 0.5;
  }

  50% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
