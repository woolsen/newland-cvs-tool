//CVS Util

import {cmd} from "./cmd";

export enum STATUS {
  UNKNOWN = 'unknown',
  MODIFIED = 'modified',
  ADDED = 'added',
  REMOVED = 'removed',
  CONFLICT = 'conflict',
  UP_TO_DATE = 'up-to-date',
}

export class InvalidCVSRootError extends Error {
  constructor() {
    super('Invalid CVSROOT');
  }
}

async function getStatus(filePath: string): Promise<STATUS> {
  const fileName = filePath.split(/([\\/])/).pop()!;
  const dir = filePath.substring(0, filePath.lastIndexOf(fileName));
  try {
    const stdout = await cmd(`cvs status -v ${fileName}`, dir);
    console.log(stdout)
    return parseStatus(stdout);
  } catch (e: any) {
    if (e.message.includes('No CVSROOT specified')) {
      throw new InvalidCVSRootError();
    }
    throw e
  }
}

async function add(filePath: string) {
  const fileName = filePath.split(/([\\/])/).pop();
  if (!fileName) {
    return false;
  }
  const dir = filePath.substring(0, filePath.lastIndexOf(fileName));
  const stdout = await cmd(`cvs add ${fileName}`, dir);
  return stdout.startsWith('scheduling file');
}

async function update(filePath: string) {
  const fileName = filePath.split(/([\\/])/).pop();
  if (!fileName) {
    return false;
  }
  const dir = filePath.substring(0, filePath.lastIndexOf(fileName));
  const stdout = await cmd(`cvs update ${fileName}`, dir);
  return stdout.startsWith('U');
}

async function commit(filePath: string, message: string) {
  const fileName = filePath.split(/([\\/])/).pop();
  if (!fileName) {
    return false;
  }
  const dir = filePath.substring(0, filePath.lastIndexOf(fileName));
  const stdout = await cmd(`cvs commit -m "${message}" ${fileName}`, dir);
  return stdout.startsWith('Checking in');
}

async function updateTag(filePath: string, tag: string) {
  const fileName = filePath.split(/([\\/])/).pop();
  if (!fileName) {
    return false;
  }
  const dir = filePath.substring(0, filePath.lastIndexOf(fileName));
  const stdout = await cmd(`cvs tag -F ${tag} ${fileName}`, dir);
  return stdout.startsWith('T');
}

async function getHistory(filename: string | string[], dir: string): Promise<string> {
  let filenameStr;
  if (Array.isArray(filename)) {
    filenameStr = filename.join(' ');
  } else {
    filenameStr = filename;
  }
  if (!filenameStr) {
    return '';
  }
  console.log(`dir: ${dir}`)
  console.log(`cvs history -w -c -l ${filenameStr}`)
  return (await cmd(`cvs history -w -c -l ${filenameStr}`, dir)).trim();
}

/**
 * 获取最新的标签
 * @param stdout
 */
function parseStatus(stdout: string): STATUS {
  if (stdout.includes('File:')) {
    if (stdout.includes('Status: Up-to-date')) {
      return STATUS.UP_TO_DATE;
    } else if (stdout.includes('Status: Locally Modified')) {
      return STATUS.MODIFIED;
    } else if (stdout.includes('Status: Locally Added')) {
      return STATUS.ADDED;
    } else if (stdout.includes('Status: Removed')) {
      return STATUS.REMOVED;
    } else if (stdout.includes('Status: Unresolved Conflict')) {
      return STATUS.CONFLICT;
    }
  }
  return STATUS.UNKNOWN;
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


export const cvs = {
  STATUS,
  getStatus,
  add,
  commit,
  update,
  updateTag,
  getHistory,
};
