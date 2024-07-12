<script lang="ts" setup>
import { ref } from 'vue';
import { CloseOutlined } from '@ant-design/icons-vue';

const props = defineProps<{
  tag: string;
}>();

const emit = defineEmits<{
  (e: 'check'): void;
  (e: 'delete'): void;
}>();

const hover = ref(false);

const handleDelete = () => {
  console.log(`delete tag ${tag}`)
  emit('delete');
};

</script>

<template>
  <div class="tag-history"
       @mouseleave="hover = false"
       @mouseover="hover = true">
    <span>{{ tag }}</span>
    <CloseOutlined class="delete-icon" v-if="hover" @click.prevent="handleDelete" />
  </div>
</template>

<style scoped>
.tag-history {
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  flex-direction: column; /* 垂直排列元素 */
  justify-content: center;
  align-items: start;
  position: relative; /* 为了定位绝对位置的图标 */
}

.tag-history:hover {
  cursor: pointer;
  color: #1890ff;
  background: #f0f0f0;
}

.delete-icon {
  position: absolute;
  top: 50%; /* 定位到父元素的中间 */
  right: 0; /* 定位到父元素的右边 */
  transform: translateY(-50%); /* 垂直居中 */
  margin-right: 8px;
  cursor: pointer;
}
</style>
