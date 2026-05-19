const util = require('../../utils/util.js')
const db = require('../../utils/db.js')

const PREDEFINED_TAGS = [
  { id: 'jiahuo', name: '#加活', icon: '💼' },
  { id: 'shuaiguo', name: '#甩锅', icon: '🥘' },
  { id: 'jiaban', name: '#加班', icon: '🌙' },
  { id: 'wuli', name: '#顾客无理', icon: '😤' },
  { id: 'daigang', name: '#代岗', icon: '🔄' }
]

Page({
  data: {
    // 语音录制状态
    isRecording: false,
    recordTime: 0,
    recordTimer: null,
    
    // 弹窗显示状态
    showInputModal: false,
    showTagModal: false,
    
    // 表单数据
    content: '',
    minutes: 5,
    selectedTags: [],
    images: [],
    audio: null,
    
    // 标签数据
    predefinedTags: PREDEFINED_TAGS,
    customTags: [],
    
    // 录音管理器
    recorderManager: null,
    innerAudioContext: null,
    
    // 加载状态
    loading: false
  },

  onLoad() {
    this.initRecorder()
    this.loadCustomTags()
  },

  onShow() {
    this.loadCustomTags()
  },

  // 初始化录音管理器
  initRecorder() {
    this.data.recorderManager = wx.getRecorderManager()
    this.data.innerAudioContext = wx.createInnerAudioContext()
    
    this.data.recorderManager.onStart(() => {
      console.log('录音开始')
      this.setData({ 
        isRecording: true,
        recordTime: 0
      })
      this.startRecordTimer()
    })
    
    this.data.recorderManager.onStop((res) => {
      console.log('录音结束', res)
      this.stopRecordTimer()
      this.setData({ isRecording: false })
      
      // 检查录音时长
      if (res.duration < 500) {
        util.showToast('说话时间太短，请重试')
        return
      }
      
      // 语音转文字
      this.speechToText(res.tempFilePath)
    })
    
    this.data.recorderManager.onError((err) => {
      console.error('录音错误', err)
      this.stopRecordTimer()
      this.setData({ isRecording: false })
      util.showToast('录音失败，请重试')
    })
  },

  // 开始录音计时
  startRecordTimer() {
    const timer = setInterval(() => {
      this.setData({
        recordTime: this.data.recordTime + 1
      })
    }, 1000)
    this.setData({ recordTimer: timer })
  },

  // 停止录音计时
  stopRecordTimer() {
    if (this.data.recordTimer) {
      clearInterval(this.data.recordTimer)
      this.setData({ recordTimer: null })
    }
  },

  // 按住说话
  onRecordStart() {
    // 检查麦克风权限
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.data.recorderManager.start({
          duration: 30000,
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 48000,
          format: 'aac'
        })
      },
      fail: () => {
        wx.showModal({
          title: '需要麦克风权限',
          content: '请在设置中开启麦克风权限以使用语音功能',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  // 松开结束录音
  onRecordEnd() {
    this.data.recorderManager.stop()
  },

  // 语音转文字
  async speechToText(filePath) {
    wx.showLoading({ title: '识别中...' })
    
    try {
      // 上传录音文件
      const cloudPath = `audio/${Date.now()}.aac`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      })
      
      // 调用云函数进行语音识别
      const { result } = await wx.cloud.callFunction({
        name: 'speechToText',
        data: {
          fileID: uploadRes.fileID
        }
      })
      
      wx.hideLoading()
      
      if (result.code === 0 && result.text) {
        this.setData({
          content: result.text,
          showInputModal: true,
          audio: {
            fileID: uploadRes.fileID,
            tempFilePath: filePath
          }
        })
      } else {
        util.showToast('识别失败，请手动输入')
        this.setData({ showInputModal: true })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('语音识别失败', err)
      util.showToast('识别失败，请手动输入')
      this.setData({ showInputModal: true })
    }
  },

  // 显示手动输入弹窗
  showManualInput() {
    this.setData({
      showInputModal: true,
      content: '',
      minutes: 5,
      selectedTags: [],
      images: [],
      audio: null
    })
  },

  // 从微信导入
  async importFromWechat() {
    try {
      const { data, errMsg } = await wx.getClipboardData()
      
      if (errMsg === 'getClipboardData:ok' && data) {
        this.setData({
          showInputModal: true,
          content: data,
          minutes: 5,
          selectedTags: [],
          images: [],
          audio: null
        })
        util.showToast('已粘贴剪贴板内容', 'success')
      } else {
        util.showToast('剪贴板为空')
      }
    } catch (err) {
      console.error('读取剪贴板失败', err)
      util.showToast('导入失败')
    }
  },

  // 关闭输入弹窗
  closeInputModal() {
    this.setData({ showInputModal: false })
  },

  // 输入内容
  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  // 输入耗时
  onMinutesInput(e) {
    let value = parseInt(e.detail.value) || 0
    if (value < 1) value = 1
    if (value > 480) value = 480
    this.setData({ minutes: value })
  },

  // 减少耗时
  decreaseMinutes() {
    if (this.data.minutes > 1) {
      this.setData({ minutes: this.data.minutes - 1 })
    }
  },

  // 增加耗时
  increaseMinutes() {
    if (this.data.minutes < 480) {
      this.setData({ minutes: this.data.minutes + 1 })
    }
  },

  // 显示标签选择
  showTagSelector() {
    this.setData({ showTagModal: true })
  },

  // 关闭标签选择
  closeTagModal() {
    this.setData({ showTagModal: false })
  },

  // 选择/取消标签
  toggleTag(e) {
    const { tag } = e.currentTarget.dataset
    const { selectedTags } = this.data
    const index = selectedTags.findIndex(t => t.id === tag.id)
    
    if (index > -1) {
      selectedTags.splice(index, 1)
    } else {
      if (selectedTags.length >= 3) {
        util.showToast('最多选择3个标签')
        return
      }
      selectedTags.push(tag)
    }
    
    this.setData({ selectedTags })
  },

  // 选择图片
  chooseImage() {
    if (this.data.images.length >= 3) {
      util.showToast('最多添加3张照片')
      return
    }
    
    wx.chooseMedia({
      count: 3 - this.data.images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(file => file.tempFilePath)
        this.setData({
          images: [...this.data.images, ...newImages]
        })
      }
    })
  },

  // 删除图片
  removeImage(e) {
    const { index } = e.currentTarget.dataset
    const images = this.data.images.filter((_, i) => i !== index)
    this.setData({ images })
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({
      current: url,
      urls: this.data.images
    })
  },

  // 播放录音
  playAudio() {
    if (this.data.audio) {
      this.data.innerAudioContext.src = this.data.audio.tempFilePath
      this.data.innerAudioContext.play()
    }
  },

  // 删除录音
  removeAudio() {
    this.setData({ audio: null })
  },

  // 保存记录
  async saveTask() {
    const { content, minutes, selectedTags } = this.data
    
    // 验证
    if (!content.trim()) {
      util.showToast('请输入内容')
      return
    }
    
    if (content.length > 200) {
      util.showToast('内容不能超过200字')
      return
    }
    
    if (selectedTags.length === 0) {
      util.showToast('请至少选择1个标签')
      return
    }
    
    this.setData({ loading: true })
    wx.showLoading({ title: '保存中...' })
    
    try {
      // 上传图片
      const imageFileIDs = []
      for (const imagePath of this.data.images) {
        const cloudPath = `images/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: imagePath
        })
        imageFileIDs.push(uploadRes.fileID)
      }
      
      // 保存到数据库
      const taskData = {
        content: content.trim(),
        minutes,
        tags: selectedTags.map(t => t.name),
        status: 0,
        images: imageFileIDs,
        audio: this.data.audio ? this.data.audio.fileID : null
      }
      
      await db.addTask(taskData)
      
      wx.hideLoading()
      this.setData({ loading: false })
      
      util.showToast('保存成功', 'success')
      this.closeInputModal()
      
      // 重置表单
      this.setData({
        content: '',
        minutes: 5,
        selectedTags: [],
        images: [],
        audio: null
      })
      
      // 跳转到清单页
      setTimeout(() => {
        wx.switchTab({ url: '/pages/list/list' })
      }, 500)
      
    } catch (err) {
      wx.hideLoading()
      this.setData({ loading: false })
      console.error('保存失败', err)
      util.showToast('保存失败，请重试')
    }
  },

  // 加载自定义标签
  async loadCustomTags() {
    try {
      const settings = await db.getSettings()
      this.setData({
        customTags: settings.customTags || []
      })
    } catch (err) {
      console.error('加载标签失败', err)
    }
  },

  preventClose() {}
})
