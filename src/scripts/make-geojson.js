import process, { features } from 'process'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import JSONStream from 'JSONStream'
import minimist from 'minimist'
import chalk from 'chalk'
import pbf from 'pbf'
import geobuf from 'geobuf'
import axios from 'axios'
import provincesCode from 'province-city-china/dist/province.json' with { type: 'json' }
import citiesCode from 'province-city-china/dist/city.json' with { type: 'json' }

// Antv L7 GISDATA 中国边界地址
const CHINA_GEOJSON_URL =
  'https://mdn.alipayobjects.com/afts/file/A*zMVuS7mKBI4AAAAAAAAAAAAADrd2AQ/全国边界.json'

// Antv L7 GISDATA 中国 省级pbf
const PROVINCE_PBF_URL = 'https://jsd.onmicrosoft.cn/npm/xingzhengqu@2024/data/gcj02/province.pbf'

// Antv L7 GISDATA 中国 市级pbf
const CITY_PBF_URL = 'https://jsd.onmicrosoft.cn/npm/xingzhengqu@2024/data/gcj02/city.pbf'

// Antv L7 GISDATA 中国 区县级pbf
const COUNTY_PBF_URL = 'https://jsd.onmicrosoft.cn/npm/xingzhengqu@2024/data/gcj02/county.pbf'

// 控制台指令实例
const info = chalk.hex('#909399')
const warn = chalk.hex('#FAAD14')
const error = chalk.hex('#FF4D4F')
const success = chalk.hex('#52C41A')

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const ARGS = minimist(process.argv.slice(2))

// 当前目录
const curDir = __dirname.split(path.sep)
// 项目根目录
const rootDir = curDir.slice(0, -2).join(path.sep)
// pbf 文件目录
const pbfDir = path.join(rootDir, 'public', 'pbf')
// boundary 文件目录
const boundaryDir = path.join(rootDir, 'public', 'boundary')
// geojson 输出目录
const geoOutDir = path.join(rootDir, 'public', 'geojson')

// 执行主函数
main()

async function main() {
  await transGeojSON()
  await assembleGeoJson()
  console.log(success('\n##: Done!'))
}

/**
 * 转换pbf文件为geojson
 * 模式一：使用public目录下的pbf文件
 * 模式二：从antv使用的CDN获取pbf文件
 * @returns
 */
function transGeojSON() {
  return new Promise((resolve, reject) => {
    // 开始转换
    console.log(info('Start converting pbf files to geojson...'))
    let mode = ARGS._[0]
    if (!mode) {
      mode = 'local'
    }
    if (!['antv', 'local'].includes(mode)) {
      // 参数如果不是 antv local 输出提示信息并使用local模式
      console.log(
        warn(
          'The mode parameter must be "local" or "antv", the parameter you entered is incorrect, the "local" mode will be used to continue.'
        )
      )
      mode = 'local'
    }

    // 校验文件和目录信息
    if (mode === 'local') {
      mode = checkFileInfo()
    }

    if (mode === 'antv') {
      // 检查boundary目录是否存在 不存在则创建
      if (!fs.existsSync(boundaryDir)) {
        console.log(warn('The boundary directory does not exist, creating.'))
        // 创建boundary目录
        fs.mkdirSync(boundaryDir)
        console.log(success('The boundary directory has been created successfully.'))
      }
      // 检查pbf目录是否存在 不存在则创建
      if (!fs.existsSync(pbfDir)) {
        console.log(warn('The pbf directory does not exist, creating.'))
        // 创建pbf目录
        fs.mkdirSync(pbfDir)
        console.log(success('The pbf directory has been created successfully.'))
      }
    }

    // 判断geoOutDir是否存在 若存在则清空其中所有文件 否则创建
    if (fs.existsSync(geoOutDir)) {
      fs.rmSync(geoOutDir, { recursive: true, force: true })
      fs.mkdirSync(geoOutDir)
    } else {
      console.log(info('The geojson directory does not exist, creating.'))
      fs.mkdirSync(geoOutDir)
      console.log(success('The geojson directory has been created successfully.'))
    }

    // 应用模式：local
    if (mode === 'local') {
      console.log(info('Using mode: local.'))

      // 复制边界文件
      copyBoundaryFile()

      // 处理pbf文件
      const files = fs.readdirSync(pbfDir)
      const transTasks = files.map(async (file) => {
        const pbfPath = path.join(pbfDir, file)
        return writeGeoJson(pbfPath, file).catch((e) => {
          throw e
        })
      })

      Promise.all(transTasks)
        .then(() => {
          console.log(success('\n##: All conversions have been completed.'))
          resolve('done')
        })
        .catch((e) => {
          reject(e)
        })
    }

    // 应用模式 antv
    if (mode === 'antv') {
      console.log(info('Using mode: antv.'))
      // 下载边界文件
      const boundaryTask = new Promise((resolve, reject) => {
        axios
          .get(CHINA_GEOJSON_URL, {
            responseType: 'arraybuffer'
          })
          .then(async (response) => {
            const fileBuffer = response.data
            const tmpPath = path.join(boundaryDir, `china_temp.geojson`)
            const targetPath = path.join(boundaryDir, `china.geojson`)
            try {
              await fs.promises.writeFile(tmpPath, fileBuffer)
              await fs.renameSync(tmpPath, targetPath)
              console.log(success(`\nThe file china.geojson is successfully downloaded and saved.`))
              copyBoundaryFile()
              resolve('done')
            } catch (e) {
              console.log(
                error(
                  `The file china.geojson is successfully downloaded, but failed when trying to save it.`
                )
              )
              reject(e)
            }
          })
          .catch((e) => {
            console.log(
              error(
                `The file china.geojson failed to download, check your network or fix the error: ${e}`
              )
            )
            reject(e)
          })
      })
      // 省级
      const provinceTask = downloadPbfToTrans(PROVINCE_PBF_URL, 'province')
      // 市级
      const cityTask = downloadPbfToTrans(CITY_PBF_URL, 'city')
      // 区县级
      const countyTask = downloadPbfToTrans(COUNTY_PBF_URL, 'county')

      Promise.all([boundaryTask, provinceTask, cityTask, countyTask])
        .then(() => {
          console.log(success('\n##: All conversions have been completed.'))
          resolve('done')
        })
        .catch((e) => {
          reject(e)
        })
    }
  })
}

/**
 * 从目标geojsonn文件中提取并组合省一级，市一级geojson文件
 */
async function assembleGeoJson() {
  const provincePath = path.join(geoOutDir, 'provinces')
  // 判断provincePath是否存在 若存在则清空其中所有文件和目录 否则创建
  if (fs.existsSync(provincePath)) {
    fs.rmSync(provincePath, { recursive: true, force: true })
    fs.mkdirSync(provincePath)
  } else {
    console.log(info('The province directory does not exist, creating.'))
    fs.mkdirSync(provincePath)
    console.log(success('The province directory has been created successfully.'))
  }
  await provinceGenerate()
  await cityGenerate()
  console.log(success('\n##: All extract have been completed.'))
}

/**
 * 生成省一级的geojson
 * @returns
 */
function provinceGenerate() {
  return new Promise((resolve, reject) => {
    // 判断china-city.geojson文件是否存在 若不存在 reject
    const targetPath = path.join(geoOutDir, 'china-city.geojson')
    if (!fs.existsSync(targetPath)) {
      console.log(error('The file china-city.geojson does not exist'))
      reject()
    }

    // 处理文件
    const provincesMap = {}
    for (let k of provincesCode) {
      provincesMap[k.code] = { ...k, features: [] }
    }
    let headers
    const readStream = fs.createReadStream(targetPath)
    const parseStream = readStream.pipe(JSONStream.parse('features.*'))
    parseStream.on('error', (err) => {
      console.log(error('Parsing error:', err))
      reject(err)
    })
    parseStream.on('header', (data) => {
      headers = data
    })
    parseStream.on('data', (feature) => {
      if (feature.properties?.province_adcode in provincesMap) {
        provincesMap[feature.properties?.province_adcode].features.push(feature)
      }
    })
    const provincePath = path.join(geoOutDir, 'provinces')
    parseStream.on('end', async () => {
      for (const key in provincesMap) {
        // code格式
        await writeExtractJson(provincesMap[key], headers || {}, provincePath, 'code')
        // name格式
        await writeExtractJson(provincesMap[key], headers || {}, provincePath, 'name')
      }
      resolve('done')
    })
  })
}

/**
 * 生成市一级的geojson
 * @returns
 */
function cityGenerate() {
  return new Promise((resolve, reject) => {
    // 判断china-county.geojson文件是否存在 若不存在 reject
    const targetPath = path.join(geoOutDir, 'china-county.geojson')
    if (!fs.existsSync(targetPath)) {
      console.log(error('The file china-county.geojson does not exist'))
      reject()
    }

    // 处理文件
    // province-city-china city.json数据缺失直辖市港澳台的数据 暂时写死
    const citiesMap = {
      110000: { code: '110000', name: '北京市', province: '11', city: '00', features: [] },
      120000: { code: '120000', name: '天津市', province: '12', city: '00', features: [] },
      310000: { code: '310000', name: '上海市', province: '31', city: '00', features: [] },
      500000: { code: '500000', name: '重庆市', province: '50', city: '00', features: [] },
      810000: { code: '810000', name: '香港特别行政区', province: '81', city: '00', features: [] },
      820000: { code: '820000', name: '澳门特别行政区', province: '82', city: '00', features: [] },
      710000: { code: '710000', name: '台湾省', province: '71', city: '00', features: [] }
    }
    for (let k of citiesCode) {
      citiesMap[k.code] = { ...k, features: [] }
    }
    let headers
    const readStream = fs.createReadStream(targetPath)
    const parseStream = readStream.pipe(JSONStream.parse('features.*'))
    parseStream.on('error', (err) => {
      console.log(error('Parsing error:', err))
      reject(err)
    })
    parseStream.on('header', (data) => {
      headers = data
    })
    parseStream.on('data', (feature) => {
      if (feature.properties?.city_adcode in citiesMap) {
        let city = citiesMap[feature.properties?.city_adcode]
        city.features.push(feature)
        // 补充省份信息
        if (!city.provinceName) {
          city.provinceName = feature.properties.province
        }
        if (!city.provinceCode) {
          city.provinceCode = feature.properties.province_adcode
        }
      }
    })
    parseStream.on('end', async () => {
      for (const key in citiesMap) {
        // 没有省份信息 或者features为空 忽略此条数据
        if (
          !citiesMap[key].provinceCode ||
          !citiesMap[key].provinceName ||
          !citiesMap[key].features.length
        ) {
          console.log(
            info('The following info will be ignored:\n', JSON.stringify(citiesMap[key], null, 2))
          )
          continue
        }

        // code格式
        const cityCodePath = path.join(geoOutDir, 'provinces', String(citiesMap[key].provinceCode))
        if (!fs.existsSync(cityCodePath)) {
          fs.mkdirSync(cityCodePath)
        }
        await writeExtractJson(citiesMap[key], headers || {}, cityCodePath, 'code')

        // name格式
        const cityNamePath = path.join(geoOutDir, 'provinces', citiesMap[key].provinceName)
        if (!fs.existsSync(cityNamePath)) {
          fs.mkdirSync(cityNamePath)
        }
        await writeExtractJson(citiesMap[key], headers || {}, cityNamePath, 'name')
      }
      resolve('done')
    })
  })
}

// local模式 校验文件信息
function checkFileInfo() {
  let mode = 'local'
  const existBounaryDir = fs.existsSync(boundaryDir)
  const existPbfDir = fs.existsSync(pbfDir)
  // boundary目录或pbf目录不存在则输出提示 切换antv模式
  if (!existBounaryDir || !existPbfDir) {
    console.log(
      warn(
        'The boundary directory or pbf directory does not exist, the "antv" mode will be used to continue.'
      )
    )
    mode = 'antv'
    return mode
  }

  // 读取boundary文件夹 如果没有china.geojson文化 切换antv模式
  if (!fs.existsSync(path.join(boundaryDir, 'china.geojson'))) {
    console.log(warn('The china.geojson does not exist, the "antv" mode will be used to continue.'))
    mode = 'antv'
    return mode
  }

  // 读取pbfDir文件夹 如果其中没有pdf文件 则切换antv模式
  // 不进一步校验pbf文件是否正确
  if (!fs.readdirSync(pbfDir).some((file) => file.endsWith('.pbf'))) {
    console.log(
      warn(
        'The pbf directory does not contain any pbf files, the "antv" mode will be used to continue.'
      )
    )
    mode = 'antv'
    return mode
  }
  return mode
}

/**
 * 复制boundary文件
 */
function copyBoundaryFile() {
  // 复制boundary目录下的china.geojson文件到geojson目录下
  const boundryPath = path.join(boundaryDir, 'china.geojson')
  const targetBoundryPath = path.join(geoOutDir, 'china.geojson')
  fs.copyFileSync(boundryPath, targetBoundryPath)
  console.log(success(`Successfully copied: ${targetBoundryPath}.`))
}

/**
 * 读取文件并返回其ArrayBuffer形式。
 * @param {string} filePath - 要读取的文件的路径。
 * @returns {Promise<ArrayBuffer>} 返回一个Promise，解析为文件的ArrayBuffer。
 */
function readAsArrayBuffer(filePath) {
  return new Promise((resolve, reject) => {
    const chunks = []

    const readStream = fs.createReadStream(filePath)
    readStream.on('data', (chunk) => {
      chunks.push(chunk)
    })
    readStream.on('error', reject)
    readStream.on('end', () => {
      /* eslint-env node */
      const buffer = Buffer.concat(chunks)
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      )
      resolve(arrayBuffer)
    })
  })
}

/**
 * 将指定目录的pbf文件转换为geoson文件写入
 * @param {string} pbfPath - PBF文件的路径。
 * @param {string} file - pbf文件名称
 * @returns {Promise}
 */
function writeGeoJson(pbfPath, file) {
  return new Promise((resolve, reject) => {
    readAsArrayBuffer(pbfPath)
      .then((fileBuffer) => {
        const vt = new pbf(fileBuffer)
        const geojson = geobuf.decode(vt)
        const geoPath = path.join(geoOutDir, 'china-' + file.replace('.pbf', '.geojson'))
        const geojsonStr = JSON.stringify(geojson, null)
        const writeStream = fs.createWriteStream(geoPath)
        writeStream.on('error', (e) => {
          console.log(error(`Error writing GeoJSON to file: ${geoPath}`, e))
          reject(e)
        })
        writeStream.write(geojsonStr, 'utf8', () => {
          writeStream.end()
          console.log(success(`Successfully converted: ${geoPath}.`))
          resolve('done')
        })
      })
      .catch((e) => reject(e))
  })
}

/**
 * 从antv使用的cdn地址下载pbf文件 转换为geojson文件
 * @param {*} url 文件地址
 * @param {*} file 文件名
 * @returns
 */
function downloadPbfToTrans(url, file) {
  return new Promise((resolve, reject) => {
    axios
      .get(url, {
        responseType: 'arraybuffer'
      })
      .then(async (response) => {
        const fileBuffer = response.data
        const tmpPath = path.join(pbfDir, `${file}_temp.pbf`)
        const targetPath = path.join(pbfDir, `${file}.pbf`)
        try {
          await fs.promises.writeFile(tmpPath, fileBuffer)
          await fs.renameSync(tmpPath, targetPath)
          console.log(success(`\nThe file ${file}.pbf is successfully downloaded and saved.`))
          console.log(info('Start converting.'))
          await writeGeoJson(targetPath, `${file}.pbf`)
          resolve('done')
        } catch (e) {
          // 重命名失败，删除临时文件
          await fs.unlinkSync(tmpPath)
          console.log(
            error(
              `The file ${file}.pbf is successfully downloaded, but failed when trying to save it.`
            )
          )
          reject(e)
        }
      })
      .catch((e) => {
        console.log(
          error(
            `The file ${file}.pbf failed to download, check your network or fix the error: ${e}`
          )
        )
        reject(e)
      })
  })
}

/**
 * 将提取汇总的geojson写入文件
 * @param {*} geojsonInfo 提取的信息
 * @param {*} headers geojson文件原附带的其他头信息
 * @param {*} parentDir 目标目录
 * @param {*} key 使用哪个字段作为文件名
 * @returns
 */
function writeExtractJson(geojsonInfo, headers, parentDir, key) {
  return new Promise((resolve, reject) => {
    const targetPath = path.join(parentDir, `${geojsonInfo[key]}.geojson`)
    const writeStream = fs.createWriteStream(targetPath)
    const writeObj = {
      ...headers,
      features: geojsonInfo.features
    }
    const writeStr = JSON.stringify(writeObj, null)
    writeStream.on('error', (e) => {
      console.log(error(`Error writing: ${targetPath}`, e))
      reject(e)
    })
    writeStream.write(writeStr, 'utf8', () => {
      writeStream.end()
      console.log(success(`Successfully writing: ${targetPath}.`))
      resolve('done')
    })
  })
}
