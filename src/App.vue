<script lang="ts" setup>
import {reactive, ref} from 'vue'
import {message as antMessage, notification, TableProps} from "ant-design-vue";
import {Key} from "ant-design-vue/es/table/interface";
import {commit, CVS_STATUS, getStatus, updateTag} from "./utils/cvs";

class FileDetail {
  name: string
  path: string
  tag?: string
  status?: CVS_STATUS | 'loading' | 'error'

  constructor(name: string, path: string) {
    this.name = name
    this.path = path
  }
}

const files = ref<FileDetail[]>([])
const message = ref<string>('')
const tag = ref<string>('')

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
    width: 100
  },
  {
    title: '操作',
    dataIndex: 'action',
    key: 'action',
    width: 60
  },
]

const buttonState = reactive({
  commitLoading: false
})

const fileTableState = reactive<{
  selectedRowKeys: Key[];
  loading: boolean;
}>({
  selectedRowKeys: [],
  loading: false,
});

const onSelectChange = (selectedRowKeys: Key[]) => {
  console.log('selectedRowKeys changed: ', selectedRowKeys);
  fileTableState.selectedRowKeys = selectedRowKeys;
};

const updateStatus = async (file: FileDetail) => {
  try {
    file.status = await getStatus(file.path)
  } catch (e) {
    console.error(e)
    file.status = 'error'
  }
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
  fileTableState.selectedRowKeys.push(detail.path);
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
  if (!fileTableState.selectedRowKeys.length) {
    antMessage.error('请选择文件')
    return
  }
  if (!tag.value) {
    antMessage.error('TAG不能为空')
    return
  }
  buttonState.commitLoading = true
  const filesToCommit = files.value.filter(f => fileTableState.selectedRowKeys.includes(f.path))
  const messageKey = 'commit';
  antMessage.loading({content: '提交中...', key: messageKey, duration: 0});
  console.log('commit file:', filesToCommit)
  console.log('commit message:', message.value)
  console.log('update tag:', tag.value)
  for (let file of filesToCommit) {
    console.log('committing', file.path)
    try {
      antMessage.loading({content: `提交 ${file.name} 中...`, key: messageKey, duration: 0});
      await commit(file.path, message.value)
    } catch (e: any) {
      console.error(e)
      notification.error({
        message: `提交 ${file.name} 失败`,
        description: e.message,
        duration: 2,
        placement: 'bottomRight'
      })
    }
    try {
      antMessage.loading({content: `更新 ${file.name} TAG中...`, key: messageKey, duration: 0});
      await updateTag(file.path, tag.value)
    } catch (e: any) {
      console.error(e)
      notification.error({
        message: `更新 ${file.name} TAG失败`,
        description: e.message,
        duration: 2,
        placement: 'bottomRight'
      })
    }
  }
  antMessage.success({content: '提交完成', key: messageKey, duration: 2});
  console.log('commit done')
  buttonState.commitLoading = false
}
</script>

<template>
  <div style="width: 100%" @dragover.prevent="() => {}" @drop.prevent="handleDrop">
    <a-table :columns="columns" :data-source="files" :pagination="false"
             :row-selection="{ selectedRowKeys: fileTableState.selectedRowKeys, onChange: onSelectChange}"
             rowKey="path" size="small">
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'status'">
          <a-tag v-if="record.status"
                 :color="record.status === 'error' ? 'red' : 'green'">
            {{ record.status }}
          </a-tag>
          <a-spin v-else/>
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
      <a-input v-model:value="tag" placeholder="请输入TAG"/>
    </a-form-item>
    <a-form-item style="margin-left: 80px">
      <a-button :loading="buttonState.commitLoading"
                style="width: 100%; "
                type="primary" @click="handleCommit">提交
      </a-button>
    </a-form-item>
  </a-form>
</template>

<style scoped>
.ant-form-item {
  margin-bottom: 8px;
}
</style>
