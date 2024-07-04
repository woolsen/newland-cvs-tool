import StoreUtil from "../utils/store";
import {FileDetail} from "../utils/bean";

class TagStore {
  private static readonly STORAGE_KEY = 'tags';

  // 获取所有 tags
  public static getTags(): string[] {
    return StoreUtil.get<string[]>(this.STORAGE_KEY, []) || [];
  }

  // 添加一个 tag, 新添加的 tag 会被插入到数组的第一位
  public static addTag(tag: string): string[] {
    const tags = this.getTags();
    const index = tags.indexOf(tag);
    if (index !== -1) {
      tags.splice(index, 1);
    }
    tags.unshift(tag);
    StoreUtil.set(this.STORAGE_KEY, tags);
    return tags;
  }

  // 删除一个 tag
  public static removeTag(tag: string): void {
    const tags = this.getTags();
    const index = tags.indexOf(tag);
    if (index !== -1) {
      tags.splice(index, 1);
      StoreUtil.set(this.STORAGE_KEY, tags);
      StoreUtil.delete(`tag-files-${tag}`);
    }
  }

  // 获取 tag 对应的文件列表
  public static getTagFiles(tag: string): FileDetail[] {
    return StoreUtil.get<FileDetail[]>(`tag-files-${tag}`, []) || [];
  }

  // 设置 tag 对应的文件列表
  public static setTagFiles(tag: string, files: FileDetail[]): void {
    StoreUtil.set(`tag-files-${tag}`, files);
  }

  // 清空所有 tags
  public static clearTags(): void {
    this.getTags().forEach(tag => {
      StoreUtil.delete(`tag-files-${tag}`);
    })
    StoreUtil.delete(this.STORAGE_KEY);
  }
}

// 导出类
export default TagStore;
