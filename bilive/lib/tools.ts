import util from 'util'
import crypto from 'crypto'
import got from 'got'
import { CookieJar } from 'tough-cookie'
import { EventEmitter } from 'events'
import { IncomingHttpHeaders } from 'http'
/**
 * 一些工具, 供全局调用
 *
 * @class Tools
 * @extends {EventEmitter}
 */
class Tools extends EventEmitter {
  constructor() {
    super()
    this.on('systemMSG', (data: systemMSG) => this.Log(data.message))
  }
  /**
   * 请求头
   *
   * @param {string} platform
   * @returns {request.Headers}
   * @memberof tools
   */
  public getHeaders(platform: string): IncomingHttpHeaders {
    switch (platform) {
      case 'Android':
        return {
          'Connection': 'Keep-Alive',
          'User-Agent': 'Mozilla/5.0 BiliDroid/5.43.1 (bbcallen@gmail.com)'
        }
      case 'WebView':
        return {
          'Accept': 'application/json, text/javascript, */*',
          'Accept-Language': 'zh-CN',
          'Connection': 'keep-alive',
          'Cookie': 'l=v',
          'Origin': 'https://live.bilibili.com',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0.0; G8142 Build/47.1.A.12.270; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.91 Mobile Safari/537.36 BiliApp/5300000',
          'X-Requested-With': 'tv.danmaku.bili'
        }
      default:
        return {
          'Accept': 'application/json, text/javascript, */*',
          'Accept-Language': 'zh-CN',
          'Connection': 'keep-alive',
          'Cookie': 'l=v',
          'DNT': '1',
          'Origin': 'https://live.bilibili.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
        }
    }
  }
  /**
   * 添加request头信息
   *
   * @template T
   * @param {XHRoptions} options
   * @param {('PC' | 'Android' | 'WebView')} [platform='PC']
   * @returns {(Promise<XHRresponse<T> | undefined>)}
   * @memberof tools
   */
  public async XHR<T>(options: XHRoptions, platform: 'PC' | 'Android' | 'WebView' = 'PC'): Promise<XHRresponse<T> | undefined> {
    // 为了兼容已有插件
    if (options.url === undefined && options.uri !== undefined) {
      options.url = options.uri
      delete options.uri
    }
    if (options.cookieJar === undefined && options.jar !== undefined) {
      options.cookieJar = options.jar
      delete options.jar
    }
    if (options.encoding === null) {
      options.responseType = 'buffer'
      delete options.encoding
    }
    if (options.json === true) {
      options.responseType = 'json'
      delete options.json
    }
    // 添加头信息
    const headers = this.getHeaders(platform)
    options.headers = options.headers === undefined ? headers : Object.assign(headers, options.headers)
    if (options.method?.toLocaleUpperCase() === 'POST' && options.headers['Content-Type'] === undefined)
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
    // @ts-ignore got把参数分的太细了, 导致responseType没法确定
    const gotResponse = await got<T>(options).catch(error => this.ErrorLog(options.url, error))
    if (gotResponse === undefined) return
    else return { response: gotResponse, body: gotResponse.body }
  }
  /**
   * 获取cookie值
   *
   * @param {CookieJar} jar
   * @param {string} key
   * @param {*} [url=apiLiveOrigin]
   * @returns {string}
   * @memberof tools
   */
  public getCookie(jar: CookieJar, key: string, url = 'https://api.live.bilibili.com'): string {
    const cookies = jar.getCookiesSync(url)
    const cookieFind = cookies.find(cookie => cookie.key === key)
    return cookieFind === undefined ? '' : cookieFind.value
  }
  /**
   * 设置cookie
   *
   * @param {string} cookieString
   * @returns {CookieJar}
   * @memberof tools
   */
  public setCookie(cookieString: string): CookieJar {
    const jar = new CookieJar()
    if (cookieString !== '') cookieString.split(';').forEach(cookie => jar.setCookieSync(`${cookie}; Domain=bilibili.com; Path=/`, 'https://bilibili.com'))
    return jar
  }
  /**
   * 格式化JSON
   *
   * @template T
   * @param {string} text
   * @param {((key: any, value: any) => any)} [reviver]
   * @returns {(Promise<T | undefined>)}
   * @memberof tools
   */
  public JSONparse<T>(text: string, reviver?: ((key: any, value: any) => any)): Promise<T | undefined> {
    return new Promise<T | undefined>(resolve => {
      try {
        const obj = JSON.parse(text, reviver)
        return resolve(obj)
      }
      catch (error) {
        this.ErrorLog('JSONparse', error)
        return resolve()
      }
    })
  }
  /**
   * Hash
   *
   * @param {string} algorithm
   * @param {(string | Buffer)} data
   * @returns {string}
   * @memberof tools
   */
  public Hash(algorithm: string, data: string | Buffer): string {
    return crypto.createHash(algorithm).update(data).digest('hex')
  }
  /**
   * 当前系统时间
   *
   * @returns {string}
   * @memberof Tools
   */
  public Date(): string {
    return new Date().toString().slice(4, 24)
  }
  /**
   * 格式化输出, 配合PM2凑合用
   *
   * @param {...any[]} message
   * @memberof tools
   */
  public Log(...message: any[]) {
    const log = util.format(`${this.Date()} :`, ...message)
    if (this.logs.length > 500) this.logs.shift()
    this.emit('log', log)
    this.logs.push(log)
    console.log(log)
  }
  public logs: string[] = []
  /**
   * 格式化输出, 配合PM2凑合用
   *
   * @param {...any[]} message
   * @memberof tools
   */
  public ErrorLog(...message: any[]) {
    console.error(`${this.Date()} :`, ...message)
  }
  /**
   * sleep
   *
   * @param {number} ms
   * @returns {Promise<'sleep'>}
   * @memberof tools
   */
  public Sleep(ms: number): Promise<'sleep'> {
    return new Promise<'sleep'>(resolve => setTimeout(() => resolve('sleep'), ms))
  }
  /**
   * 为了兼容旧版
   *
   * @param {string} message
   * @returns {void}
   * @memberof Tools
   */
  public sendSCMSG!: (message: string) => void
  /**
   * 验证码识别
   *
   * @param {string} captchaJPEG
   * @returns {Promise<string>}
   * @memberof tools
   */
  public Captcha!: (captchaJPEG: string) => Promise<string>
}
export default new Tools()