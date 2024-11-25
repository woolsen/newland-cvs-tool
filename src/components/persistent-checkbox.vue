<template>
  <a-checkbox :checked="checked" @change="handleChange">
    <slot></slot>
  </a-checkbox>
</template>

<script lang="ts">
import {defineComponent, onMounted, PropType, ref} from 'vue';

export default defineComponent({
  name: 'PersistentCheckbox',
  props: {
    check: {
      type: Boolean,
      default: false
    },
    defaultCheck: {
      type: [Boolean, String] as PropType<boolean | string>,
      default: false,
    },
    storageKey: {
      type: String,
      required: true
    }
  },
  emits: ['change'],
  setup(props, {emit}) {

    const key = `persistent-checkbox-${props.storageKey}`

    // 获取初始值
    const getInitialValue = () => {
      const savedValue = localStorage.getItem(key);
      if (savedValue) {
        return savedValue === 'true';
      } else {
        return  typeof props.defaultCheck === 'boolean' ?
            props.defaultCheck :
            props.defaultCheck === 'true';
      }
    };

    const checked = ref(getInitialValue());
    emit('change', getInitialValue());

    // 当复选框状态改变时，更新localStorage并发出更新事件
    const handleChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      checked.value = target.checked;
      localStorage.setItem(key, String(checked.value));
      emit('change', checked.value);
    };

    return {
      checked: checked,
      handleChange
    };
  }
});
</script>
