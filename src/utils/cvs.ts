//CVS Util

import {cmd} from "../demos/ipc";

export enum CVS_STATUS {
  UNKNOWN = 'Unknown',
  MODIFIED = 'Modified',
  ADDED = 'Added',
  REMOVED = 'Removed',
  CONFLICT = 'Conflict',
  UP_TO_DATE = 'Up-to-date'
}

export async function getStatus(filePath: string): Promise<CVS_STATUS> {
  const fileName = filePath.split(/([\\/])/).pop();
  if (!fileName) {
    return CVS_STATUS.UNKNOWN;
  }
  const dir = filePath.substring(0, filePath.lastIndexOf(fileName));
  // await cmd('cvs status ' + fileName, dir)
  const stdout = await cmd(`cvs status -v ${fileName}`, dir);
  return parseStatus(stdout);
}

export async function commit(filePath: string, message: string) {
  const fileName = filePath.split(/([\\/])/).pop();
  if (!fileName) {
    return false;
  }
  const dir = filePath.substring(0, filePath.lastIndexOf(fileName));
  const stdout = await cmd(`cvs commit -m "${message}" ${fileName}`, dir);
  return stdout.startsWith('Checking in');
}

export async function updateTag(filePath: string, tag: string) {
  const fileName = filePath.split(/([\\/])/).pop();
  if (!fileName) {
    return false;
  }
  const dir = filePath.substring(0, filePath.lastIndexOf(fileName));
  const stdout = await cmd(`cvs tag -F ${tag} ${fileName}`, dir);
  return stdout.startsWith('T');
}

export async function getHistory(filePath: string): Promise<string> {
  const fileName = filePath.split(/([\\/])/).pop();
  if (!fileName) {
    return '';
  }
  const dir = filePath.substring(0, filePath.lastIndexOf(fileName));
  return await cmd(`cvs history -w -c -l ${fileName}`, dir);
}

/**
 * 获取最新的标签
 * @param stdout
 */
function parseStatus(stdout: string): CVS_STATUS {
  if (stdout.includes('File:')) {
    if (stdout.includes('Status: Up-to-date')) {
      return CVS_STATUS.UP_TO_DATE;
    } else if (stdout.includes('Status: Locally Modified')) {
      return CVS_STATUS.MODIFIED;
    } else if (stdout.includes('Status: Added')) {
      return CVS_STATUS.ADDED;
    } else if (stdout.includes('Status: Removed')) {
      return CVS_STATUS.REMOVED;
    } else if (stdout.includes('Status: Conflict')) {
      return CVS_STATUS.CONFLICT;
    }
  }
  return CVS_STATUS.UNKNOWN;
}

/**
 * 从CVS输出中提取最新的标签
 */
function parseLatestTag(cvsOutput: string): string[] {
  // 分割输出为行数组
  const lines = cvsOutput.split('\n');

  // 找到包含“Repository revision”的行并提取修订版本号
  const repoRevisionLine = lines.find(line => line.includes('Repository revision'));
  if (!repoRevisionLine) {
    return [];
  }
  const repoRevisionMatch = repoRevisionLine.match(/(\d+\.\d+)/);
  const repoRevision = repoRevisionMatch ? repoRevisionMatch[1] : null;

  // 找到所有的标签和其对应的修订版本
  const tagLines = lines.filter(line => line.trim().startsWith('Existing Tags:') || line.trim().startsWith('        '));
  const tags = tagLines.slice(1).map(line => {
    const parts = line.trim().split(/\s+/); // 分割每行以空格
    return {
      tag: parts[0],
      revision: parts[2].replace('(', '').replace(')', '')
    };
  });

  // 筛选出与“Repository revision”相同版本的所有标签
  const latestTags = tags.filter(tag => tag.revision === repoRevision);

  return latestTags.map(tag => tag.tag);
}
