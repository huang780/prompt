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
    taskId: '',
    task: null,
    loading: true,
    isEditing: false,
    editForm: {},
    recorderManager: null,
    innerAudioContext: null,
    showTagModal: false,
    images: [],
    audio: null
  },

  onLoad(options) {
    this.setData({ taskId: options.id })
    this.loadTaskDetail()
    this.initRecorder()
  },

  onUnload() {
    if (this.data.innerAudioContext) {
      this.data.innerAudioContext.destroy()
    }
  },

  initRecorder() {
    this.data.recorderManager = wx.getRecorderManager()
    this.data.innerAudioContext = wx.createInnerAudioContext()
  },

  async loadTaskDetail() {
    wx.showLoading({ title: '加载中...' })
    
    try {
      const task = await db.getTaskById(this.data.taskId)
      
      // 获取图片URL
      const images = []
      if (task.images && task.images.length > 0) {
        for (const fileID of task.images) {
          try {
            const url = await wx.cloud.getTempFileURL({ fileID })
            images.push(url.tempFileURL)
          } catch (err) {
            console.error('获取图片URL失败', err)
          }
        }
      }
      
      // 获取录音URL
      let audioUrl = null
      if (task.audio) {
        try {
          const res = await wx.cloud.getTempFileURL({ fileID: task.audio })
          audioUrl = res.tempFileURL
        } catch (err) {
          console.error('获取录音URL失败', err)
        }
      }
      
      // 处理标签显示
      const tagObj = PREDEFINED_TAGS.find(t => task.tags.includes(t.name))
      
      this.setData({
        task: {
          ...task,
          tagIcon: tagObj ? tagObj.icon : '📝',
          createTimeStr: util.formatDate(new Date(task.createTime), 'YYYY-MM-DD HH:mm')
        },
        images,
        audio: audioUrl,
        loading: false
      })
      
      wx.hideLoading()
      
    } catch (err) {
      wx.hideLoading()
      this.setData({ loading: false })
      console.error('加载失败', err)
      util.showToast('加载失败')
    }
  },

  // 进入编辑模式
  enterEditMode() {
    const { task } = this.data
    const selectedTags = task.tags.map(name => {
      return PREDEFINED_TAGS.find(t => t.name === name) || { name, icon: '📝', id: name }
    })
    
    this.setData({
      isEditing: true,
      editForm: {
        content: task.content,
        minutes: task.minutes,
        status: task.status,
        remark: task.remark || '',
        tags: selectedTags
      }
    })
  },

  // 退出编辑模式
  exitEditMode() {
    this.setData({ isEditing: false })
  },

  // 输入内容
  onContentInput(e) {
    this.setData({
      'editForm.content': e.detail.value
    })
  },

  // 输入耗时
  onMinutesInput(e) {
    let value = parseInt(e.detail.value) || 0
    if (value < 1) value = 1
    if (value > 480) value = 480
    this.setData({
      'editForm.minutes': value
    })
  },

  // 输入备注
  onRemarkInput(e) {
    this.setData({
      'editForm.remark': e.detail.value
    })
  },

  // 切换状态
  toggleStatus() {
    const newStatus = this.data.editForm.status === 0 ? 1 : 0
    this.setData({
      'editForm.status': newStatus
    })
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
    const { tags } = this.data.editForm
    const index = tags.findIndex(t => t.id === tag.id)
    
    if (index > -1) {
      tags.splice(index, 1)
    } else {
      if (tags.length >= 3) {
        util.showToast('最多选择3个标签')
        return
      }
      tags.push(tag)
    }
    
    this.setData({
      'editForm.tags': [...tags]
    })
  },

  // 添加图片
  async addImage() {
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
      this.data.innerAudioContext.src = this.data.audio
      this.data.innerAudioContext.play()
    }
  },

  // 删除录音
  removeAudio() {
    this.setData({ audio: null })
  },

  // 重新录音
  reRecord() {
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
        
        this.data.recorderManager.onStop((res) => {
          this.setData({ audio: res.tempFilePath })
        })
      },
      fail: () => {
        wx.showModal({
          title: '需要麦克风权限',
          content: '请在设置中开启麦克风权限',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  // 保存编辑
  async saveEdit() {
    const { editForm, images, audio } = this.data
    
    if (!editForm.content.trim()) {
      util.showToast('请输入内容')
      return
    }
    
    if (editForm.tags.length === 0) {
      util.showToast('请至少选择1个标签')
      return
    }
    
    wx.showLoading({ title: '保存中...' })
    
    try {
      // 上传新图片
      const imageFileIDs = []
      for (const imagePath of images) {
        if (imagePath.startsWith('http') || imagePath.startsWith('cloud://')) {
          imageFileIDs.push(imagePath)
        } else {
          const cloudPath = `images/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: imagePath
          })
          imageFileIDs.push(uploadRes.fileID)
        }
      }
      
      // 保存更新
      const updateData = {
        content: editForm.content.trim(),
        minutes: editForm.minutes,
        status: editForm.status,
        tags: editForm.tags.map(t => t.name),
        images: imageFileIDs,
        audio: audio && !audio.startsWith('cloud://') ? null : audio
      }
      
      if (editForm.remark) {
        updateData.remark = editForm.remark
      }
      
      await db.updateTask(this.data.taskId, updateData)
      
      wx.hideLoading()
      util.showToast('保存成功', 'success')
      
      this.setData({ isEditing: false })
      this.loadTaskDetail()
      
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败', err)
      util.showToast('保存失败')
    }
  },

  // 转发
  onShareAppMessage() {
    const { task } = this.data
    return {
      title: `小事清 · ${task.tags[0] || '记录'}`,
      path: `/pages/detail/detail?id=${this.data.taskId}`,
      imageUrl: this.data.images[0] || ''
    }
  },

  // 生成长图
  async generateImage() {
    wx.showLoading({ title: '生成中...' })
    
    try {
      const { task, images } = this.data
      
      const info = wx.createSelectorQuery()
      const painter = await this.getSystemInfo()
      
      const canvas = wx.createCanvasContext('evidence-canvas')
      
      // 设置画布
      canvas.setFillStyle('#ffffff')
      canvas.fillRect(0, 0, 750, 1200)
      
      // 标题
      canvas.setFontSize(48)
      canvas.setFillStyle('#333333')
      canvas.fillText('维权证据', 60, 100)
      
      // 时间
      canvas.setFontSize(28)
      canvas.setFillStyle('#999999')
      canvas.fillText(task.createTimeStr, 60, 160)
      
      // 标签
      canvas.setFontSize(32)
      canvas.setFillStyle('#07c160')
      canvas.fillText(task.tags.join(' '), 60, 220)
      
      // 内容
      canvas.setFontSize(36)
      canvas.setFillStyle('#333333')
      const contentLines = this.wrapText(task.content, 34, 630)
      let y = 300
      contentLines.forEach(line => {
        canvas.fillText(line, 60, y)
        y += 60
      })
      
      // 耗时
      canvas.setFontSize(28)
      canvas.setFillStyle('#666666')
      canvas.fillText(`耗时：${task.minutes} 分钟`, 60, y + 40)
      
      // 图片
      if (images.length > 0) {
        y += 120
        canvas.setFontSize(28)
        canvas.setFillStyle('#333333')
        canvas.fillText('照片证据：', 60, y)
        y += 60
        
        for (let i = 0; i < images.length; i++) {
          const img = images[i]
          if (y < 1100) {
            canvas.drawImage(img, 60, y, 300, 225)
            y += 245
          }
        }
      }
      
      // 底部时间戳
      canvas.setFontSize(24)
      canvas.setFillStyle('#cccccc')
      canvas.fillText(`生成时间：${util.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')}`, 60, 1160)
      
      canvas.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: 'evidence-canvas',
          success: (res) => {
            wx.hideLoading()
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                util.showToast('已保存到相册', 'success')
              },
              fail: () => {
                util.showToast('保存失败')
              }
            })
          },
          fail: () => {
            wx.hideLoading()
            util.showToast('生成失败')
          }
        })
      })
      
    } catch (err) {
      wx.hideLoading()
      console.error('生成失败', err)
      util.showToast('生成失败')
    }
  },

  wrapText(text, fontSize, maxWidth) {
    const chars = text.split('')
    const lines = []
    let currentLine = ''
    
    chars.forEach(char => {
      const testLine = currentLine + char
      const width = testLine.length * fontSize
      
      if (width > maxWidth) {
        lines.push(currentLine)
        currentLine = char
      } else {
        currentLine = testLine
      }
    })
    
    if (currentLine) {
      lines.push(currentLine)
    }
    
    return lines
  },

  async getSystemInfo() {
    return wx.getSystemInfoSync()
  },

  preventClose() {}
})
