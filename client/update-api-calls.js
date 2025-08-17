const fs = require('fs');
const path = require('path');

// 需要更新的文件列表
const filesToUpdate = [
  'src/pages/DollsPage.js',
  'src/pages/MakeupPage.js',
  'src/pages/WardrobePage.js',
  'src/pages/MyPage.js',
  'src/components/UnmadeMakeup.js',
  'src/components/PhotoGallery.js',
  'src/components/MakeupHistory.js',
  'src/components/MakeupAppointment.js',
  'src/components/ImageUpload.js',
  'src/components/CurrentMakeup.js',
  'src/components/BodyMakeup.js',
  'src/components/WardrobeCategory.js',
  'src/components/MakeupBook.js'
];

// 替换规则
const replacements = [
  // 基本的fetch GET请求
  {
    pattern: /fetch\(['"`]http:\/\/localhost:5000(\/api\/[^'"`]+)['"`]\)/g,
    replacement: 'apiGet(\'$1\')'
  },
  // 带method的fetch请求 - POST
  {
    pattern: /fetch\(['"`]http:\/\/localhost:5000(\/api\/[^'"`]+)['"`],\s*{\s*method:\s*['"`]POST['"`]/g,
    replacement: 'apiPost(\'$1\', '
  },
  // 带method的fetch请求 - PUT
  {
    pattern: /fetch\(['"`]http:\/\/localhost:5000(\/api\/[^'"`]+)['"`],\s*{\s*method:\s*['"`]PUT['"`]/g,
    replacement: 'apiPut(\'$1\', '
  },
  // 带method的fetch请求 - DELETE
  {
    pattern: /fetch\(['"`]http:\/\/localhost:5000(\/api\/[^'"`]+)['"`],\s*{\s*method:\s*['"`]DELETE['"`]/g,
    replacement: 'apiDelete(\'$1\''
  },
  // 移除不需要的headers设置（API函数会自动处理）
  {
    pattern: /headers:\s*{\s*['"`]Content-Type['"`]:\s*['"`]application\/json['"`]\s*},?\s*/g,
    replacement: ''
  },
  // 移除body: JSON.stringify（API函数会自动处理）
  {
    pattern: /body:\s*JSON\.stringify\(/g,
    replacement: ''
  }
];

// 添加import语句
function addImportStatement(content, fileName) {
  // 检查是否已经有import语句
  if (content.includes('from \'../utils/api\'')) {
    return content;
  }
  
  // 根据文件类型确定相对路径
  const isComponent = fileName.includes('components');
  const importPath = isComponent ? '../utils/api' : '../utils/api';
  
  // 在第一个import语句后添加
  const importStatement = `import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '${importPath}';`;
  
  // 找到最后一个import语句的位置
  const importRegex = /^import.*from.*;$/gm;
  let lastImportMatch;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    lastImportMatch = match;
  }
  
  if (lastImportMatch) {
    const position = lastImportMatch.index + lastImportMatch[0].length;
    return content.slice(0, position) + '\n' + importStatement + content.slice(position);
  }
  
  // 如果没有找到import语句，在文件开头添加
  return importStatement + '\n' + content;
}

// 处理每个文件
filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`文件不存在: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 应用替换规则
  replacements.forEach(rule => {
    const newContent = content.replace(rule.pattern, rule.replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });
  
  // 如果有修改，添加import语句
  if (modified) {
    content = addImportStatement(content, file);
    
    // 保存文件
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 更新完成: ${file}`);
  } else {
    console.log(`⏭️ 无需更新: ${file}`);
  }
});

console.log('\n更新完成！');