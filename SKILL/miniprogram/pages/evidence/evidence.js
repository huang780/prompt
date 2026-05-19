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
    tasks: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    
    filterTags: [],
    showFilterPanel: false,
    
    isMultiSelect: false,
    selectedTasks: [],
    
    allTags: PREDEFINED_TAGS
  },

  onLoad() {
    this.loadTasks()
  },

  onShow() {
    this.loadTasks()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, tasks: [] })
    this.loadTasks().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadTasks()
    }
  },

  async loadTasks() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const options = {
        page: this.data.page,
        pageSize: this.data.pageSize,
        hasEvidence: true
      }
      
      if (this.data.filterTags.length > 0) {
        options.tags = this.data.filterTags
      }
      
      const tasks = await db.getTasks(options)
      
      const processedTasks = tasks.map(task => {
        const tagObj = PREDEFINED_TAGS.find(t => task.tags.includes(t.name))
        return {
          ...task,
          tagIcon: tagObj ? tagObj.icon : '📝',
          shortContent: task.content.length > 20 
            ? task.content.substring(0, 20) + '...' 
            : task.content,
          evidenceCount: (task.images ? task.images.length : 0) + (task.audio ? 1 : 0)
        }
      })
      
      const allTasks = this.data.page === 1 ? processedTasks : [...this.data.tasks, ...processedTasks]
      
      this.setData({
        tasks: allTasks,
        page: this.data.page + 1,
        hasMore: tasks.length === this.data.pageSize,
        loading: false
      })
      
    } catch (err) {
      console.error('加载失败', err)
      this.setData({ loading: false })
      util.showToast('加载失败')
    }
  },

  showFilter() {
    this.setData({ showFilterPanel: true })
  },

  closeFilter() {
    this.setData({ showFilterPanel: false })
  },

  toggleTagFilter(e) {
    const { tag } = e.currentTarget.dataset
    const { filterTags } = this.data
    const index = filterTags.indexOf(tag.name)
    
    if (index > -1) {
      filterTags.splice(index, 1)
    } else {
      filterTags.push(tag.name)
    }
    
    this.setData({ 
      filterTags,
      page: 1,
      tasks: []
    })
    this.loadTasks()
  },

  clearFilter() {
    this.setData({
      filterTags: [],
      page: 1,
      tasks: []
    })
    this.loadTasks()
    this.closeFilter()
  },

  enterMultiSelect(e) {
    const { id } = e.currentTarget.dataset
    this.setData({
      isMultiSelect: true,
      selectedTasks: [id]
    })
  },

  exitMultiSelect() {
    this.setData({
      isMultiSelect: false,
      selectedTasks: []
    })
  },

  toggleSelect(e) {
    const { id } = e.currentTarget.dataset
    const { selectedTasks } = this.data
    const index = selectedTasks.indexOf(id)
    
    if (index > -1) {
      selectedTasks.splice(index, 1)
    } else {
      selectedTasks.push(id)
    }
    
    this.setData({ selectedTasks })
  },

  async batchExport() {
    if (this.data.selectedTasks.length === 0) {
      util.showToast('请先选择记录')
      return
    }
    
    wx.showLoading({ title: '生成中...' })
    
    try {
      const selectedTasks = this.data.tasks.filter(
        task => this.data.selectedTasks.includes(task._id)
      )
      
      const { result } = await wx.cloud.callFunction({
        name: 'generateEvidencePDF',
        data: {
          tasks: selectedTasks
        }
      })
      
      wx.hideLoading()
      
      if (result.code === 0) {
        util.showToast('导出成功', 'success')
        this.exitMultiSelect()
      } else {
        util.showToast('导出失败')
      }
      
    } catch (err) {
      wx.hideLoading()
      util.showToast('导出失败')
    }
  },

  goToDetail(e) {
    if (this.data.isMultiSelect) return
    
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  preventClose() {}
})
