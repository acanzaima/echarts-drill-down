import axios from 'axios'
import * as echarts from 'echarts'
import type { ECBasicOption } from 'echarts/types/dist/shared.js'
import type { CallbackDataParams } from 'echarts/types/src/util/types.js'
import { BASE_PATH } from '@/config/setting'
import type { mapDataType, MapInfoType } from '../types/index'

/**
 * 生成地图配置
 * @param {*} mapData
 * @param {*} mapName
 * @returns
 */

export default function createMapOptions(MapInfoType: MapInfoType): Promise<ECBasicOption> {
  return new Promise((reslove, reject) => {
    const { mapData, mapName } = MapInfoType
    let mapPath = `geojson/${mapName}.geojson`
    if (!mapName.includes('china')) {
      mapPath = `geojson/provinces/${mapName}.geojson`
    }
    axios
      .get(mapPath, { baseURL: BASE_PATH })
      .then((result) => {
        echarts.registerMap(mapName, result.data)
        mapData.sort((a: mapDataType, b: mapDataType) => {
          return b.value - a.value
        })
        let minvalue, maxvalue
        if (mapData.length > 0) {
          maxvalue = mapData[0].value
          minvalue = mapData[mapData.length - 1].value
        } else {
          minvalue = 0
          maxvalue = 1000
        }
        const res: ECBasicOption = {
          visualMap: {
            show: true,
            type: 'continuous',
            min: minvalue,
            max: maxvalue,
            inRange: { color: ['#a0ceea', '#0152b5'], fontSize: 12 }
          },
          animation: true,
          tooltip: {
            padding: 5,
            textStyle: {
              fontSize: 14
            },
            formatter: function (params: CallbackDataParams) {
              return `${params.name}  ${params.value || ''}`
            }
          },
          series: [
            {
              type: 'map',
              map: mapName,
              roam: true,
              scaleLimit: { min: 0.7, max: 7 },
              label: {
                show: false
              },
              itemStyle: {
                areaColor: '#a0ceea',
                borderColor: '#3B5077',
                borderWidth: 2
              },
              emphasis: {
                itemStyle: {
                  areaColor: '#4fb3e6'
                }
              },
              select: {
                itemStyle: {
                  areaColor: '#4fb3e6'
                }
              },
              data: mapData
            }
          ]
        }
        reslove(res)
      })
      .catch((e) => {
        reject(e)
      })
  })
}
