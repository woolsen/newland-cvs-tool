<script lang="ts" setup>
import {computed, ComputedRef, h, onMounted, reactive, ref} from 'vue'
import {message as antMessage, Modal, notification, TableProps} from "ant-design-vue";
import {Key, type TableRowSelection} from "ant-design-vue/es/table/interface";
import {cvs, STATUS, STATUS_TEXT} from "./utils/cvs";
import TagStore from "./store/tag";
import {CompleteText, FileDetail} from "./utils/bean";
import {CloseOutlined, PlusOutlined, ReloadOutlined} from '@ant-design/icons-vue';

const message = ref<string>('')
const files = ref<FileDetail[]>([])
const tag = ref<string>('')

const tags = ref<string[]>([])
const tagCompletes: ComputedRef<CompleteText[]> = computed(() => {
  let tagCompletes = []
  const tagValue = tag.value
  for (let tag of tags.value) {
    if (!tagValue || tag.includes(tagValue)) {
      tagCompletes.push(new CompleteText(tag))
    }
  }
  return tagCompletes
});


const rowSelection: TableRowSelection<FileDetail> = reactive({
  selectedRowKeys: [],
  onChange: (selectedRowKeys: Key[], _: FileDetail[]) => {
    console.log('selectedRowKeys changed: ', selectedRowKeys);
    files.value.forEach(f => f.selected = selectedRowKeys.includes(f.path))
    rowSelection.selectedRowKeys = selectedRowKeys
  },
  getCheckboxProps: (record: FileDetail) => ({
    disabled: record.status === 'error' || record.status === cvs.STATUS.NOT_CVS_FILE,
  }),
})

const [modal, contextHolder] = Modal.useModal();

onMounted(() => {
  const tagsLocal = TagStore.getTags()
  if (!tagsLocal.length) {
    return
  }
  tags.value = tagsLocal
  tag.value = tagsLocal.length ? tagsLocal[0] : ''
  files.value = TagStore.getTagFiles(tag.value)
  rowSelection.selectedRowKeys = files.value.filter(f => f.selected).map(f => f.path)
})

const columns: TableProps<FileDetail>['columns'] = [
  {
    title: '文件路径',
    dataIndex: 'path',
    key: 'path',
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120
  },
  {
    title: '操作',
    dataIndex: 'action',
    key: 'action',
    width: 60
  },
]

const buttonState = reactive({
  commitLoading: false,
  historyLoading: false,
})

const updateStatus = async (file: FileDetail) => {
  try {
    file.status = await cvs.getStatus(file.path)
  } catch (e: any) {
    console.error(e)
    notification.error({
      message: `获取 ${file.name} 状态失败`,
      description: e.message,
      duration: 2,
      placement: 'bottomRight'
    })
    file.status = 'error'
  }
};

const onTagSelect = (value: string) => {
  tag.value = value
};

const checkoutTag = (value: string) => {
  tag.value = value
  const filesValue = TagStore.getTagFiles(tag.value)
  if (filesValue.length) {
    files.value = filesValue
  }
};

const onTagDelete = (value: string) => {
  TagStore.removeTag(value)
  tags.value = TagStore.getTags()
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  const eFiles = e.dataTransfer?.files
  if (eFiles && eFiles.length) {
    for (let i = 0; i < eFiles.length; i++) {
      addFile(eFiles[i])
    }
  }
}

function addFile(file: File) {
  if (files.value.find(f => f.path === file.path)) {
    return;
  }
  const detail = new FileDetail(file.name, file.path);
  files.value.push(detail);
  updateStatus(detail).then(() => {
    files.value = [...files.value];
  });
}

const handleDelete = (path: Key) => {
  const index = files.value.findIndex(f => f.path === path)
  if (index >= 0) {
    files.value.splice(index, 1)
  }
}

const handleCommit = async () => {
  const filesValue = files.value
  const filesToCommit = filesValue.filter(f => f.selected)
  if (!filesToCommit.length) {
    antMessage.error('请选择文件')
    return
  }
  if (!tag.value) {
    antMessage.error('TAG不能为空')
    return
  }
  if (!/^[a-zA-Z]/.test(tag.value)) {
    antMessage.error('TAG必须以字母开头')
    return
  }
  buttonState.commitLoading = true
  const messageKey = 'commit';
  antMessage.loading({content: '提交中...', key: messageKey, duration: 0});
  console.log('commit file:', filesToCommit)
  console.log('commit message:', message.value)
  console.log('update tag:', tag.value)
  const successFiles: FileDetail[] = []
  for (let file of filesToCommit) {
    console.log('committing', file.path)
    try {
      const status = await cvs.getStatus(file.path)
      antMessage.loading({content: `提交 ${file.name} 中...`, key: messageKey, duration: 0});
      if (status === cvs.STATUS.ADDED || status === cvs.STATUS.MODIFIED) {
        await cvs.commit(file.path, message.value)
      } else if (status === cvs.STATUS.UNKNOWN) {
        await cvs.add(file.path)
        await cvs.commit(file.path, message.value)
      }
    } catch (e: any) {
      console.error(e)
      notification.error({
        message: `提交 ${file.name} 失败`,
        description: e.message,
        duration: 2,
        placement: 'bottomRight'
      })
      continue
    }
    try {
      antMessage.loading({content: `更新 ${file.name} TAG中...`, key: messageKey, duration: 0});
      await cvs.updateTag(file.path, tag.value)
    } catch (e: any) {
      console.error(e)
      notification.error({
        message: `更新 ${file.name} TAG失败`,
        description: e.message,
        duration: 2,
        placement: 'bottomRight'
      })
      continue
    }
    await updateStatus(file)
    successFiles.push(file)
  }

  let historyStr = ''
  for (let file of successFiles) {
    historyStr += await cvs.getHistory(file.path) + '\n'
  }
  modal.info({
    title: '提交历史',
    content: historyStr,
    width: '100%',
    okText: '好的',
  });

  antMessage.success({content: '提交完成', key: messageKey, duration: 2});
  console.log('commit done')

  let tagsValue = TagStore.addTag(tag.value)
  TagStore.setTagFiles(tag.value, filesValue)
  buttonState.commitLoading = false
}

const handleHistory = async () => {
  const filesValue = files.value
  const filesToCommit = filesValue.filter(f => f.selected)
  if (!filesToCommit.length) {
    antMessage.error('请选择文件')
    return
  }
  buttonState.historyLoading = true
  const messageKey = 'history';
  antMessage.loading({content: '获取历史中...', key: messageKey, duration: 0});
  console.log('get history file:', filesToCommit)
  let historyStr = ''
  for (let file of filesToCommit) {
    historyStr += await cvs.getHistory(file.path) + '\n'
  }
  modal.info({
    title: '提交历史',
    content: historyStr,
    width: '100%',
    okText: '好的',
  });
  antMessage.success({content: '获取历史完成', key: messageKey, duration: 2});
  console.log('get history done')
  buttonState.historyLoading = false
}

const reloadFileList = async () => {
  files.value = files.value.map(f => {
    f.status = 'loading'
    return f
  })
  antMessage.loading({content: '文件状态刷新中...', key: 'reload', duration: 0});
  for (let file of files.value) {
    await updateStatus(file)
  }
  antMessage.success({content: '文件状态刷新完成', key: 'reload', duration: 2});
}

const handleAddFile = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files) {
      for (let i = 0; i < target.files.length; i++) {
        addFile(target.files[i])
      }
    }
  }
  input.click()
}

</script>

<template>
  <div style="display: flex; flex-direction: row">
    <a-col>
      <div class="tag-history-title">提交历史</div>
      <div v-for="tag in tags" :key="tag" class="tag-history" @click="() => checkoutTag(tag)">
        {{ tag }}
      </div>
    </a-col>
    <div class="divider"/>
    <a-col style="width: 100%">
      <a-row style="width: 100%; margin-bottom: 8px">
        <a-button :icon="h(PlusOutlined)" type="primary" @click="handleAddFile">添加文件</a-button>
      </a-row>
      <div style="width: 100%" @dragover.prevent="() => {}" @drop.prevent="handleDrop">
        <a-table :columns="columns" :data-source="files" :pagination="false"
                 :row-selection="rowSelection"
                 rowKey="path" size="small">
          <template #headerCell="{ column }">
            <template v-if="column.key === 'status'">
            <span>
              {{ column.title }}
              <reload-outlined @click="() => reloadFileList()"/>
            </span>
            </template>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'path'">
              <div style="word-break: break-all;">{{ record.path }}</div>
            </template>
            <template v-if="column.dataIndex === 'status'">
              <a-spin v-if="record.status === 'loading'"/>
              <a-tag v-else
                     :color="record.status === 'error' || record.status == cvs.STATUS.NOT_CVS_FILE? 'red': 'green'">
                {{ STATUS_TEXT[record.status as STATUS] }}
              </a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <a @click="() => handleDelete(record.path)">删除</a>
            </template>
          </template>
          <template #emptyText>
            <a-empty description="拖拽选择文件"></a-empty>
          </template>
        </a-table>
      </div>
      <a-form :label-col="{ style: { width: '80px' } }"
              labelAlign="left" style="margin-top: 16px">
        <a-form-item
            label="Message"
            name="Message">
          <a-input v-model:value="message" placeholder="请输入提交信息（可选）"/>
        </a-form-item>
        <a-form-item
            label="TAG*"
            name="tag">
          <a-auto-complete v-model:value="tag" :options="tagCompletes" allow-clear placeholder="请输入TAG"
                           @select="onTagSelect">
            <template #option="item">
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span>{{ item.value }}</span>
                <close-outlined @click.prevent="() => onTagDelete(item.value)"/>
              </div>
            </template>
          </a-auto-complete>
        </a-form-item>
        <a-form-item style="margin-left: 80px">
          <a-button :loading="buttonState.commitLoading"
                    type="primary" @click="handleCommit">提交&TAG
          </a-button>
          <a-button :loading="buttonState.historyLoading"
                    style="margin-left: 8px"
                    type="default" @click="handleHistory">获取历史
          </a-button>
        </a-form-item>
      </a-form>
    </a-col>
  </div>
  <contextHolder/>
</template>

<style scoped>
.ant-form-item {
  margin-bottom: 8px;
}

.divider {
  width: 1px;
  background: #f0f0f0;
  margin-left: 1rem;
  margin-right: 1rem;
}

.tag-history {
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
}

.tag-history-title {
  font-size: 16px;
  font-weight: bold;
  width: 200px;
  margin-bottom: 8px;
}

.tag-history:hover {
  cursor: pointer;
  color: #1890ff;
  background: #f0f0f0;
}
</style>
