// 脚本：批量修复所有组件中的API调用
const fs = require('fs');
const path = require('path');

// 要处理的目录
const directories = [
  './src/components',
  './src/pages'
];

// 要处理的文件扩展名
const extensions = ['.js', '.jsx'];

// 替换规则
const replacements = [
  {
    // 替换fetch调用为使用环境变量
    pattern: /fetch\(['"`]http:\/\/localhost:5000/g,
    replacement: 'fetch((process.env.REACT_APP_API_URL || \'http://localhost:5000\') + \''
  },
  {
    // 处理模板字符串
    pattern: /fetch\(`http:\/\/localhost:5000/g,
    replacement: 'fetch(`${process.env.REACT_APP_API_URL || \'http://localhost:5000\'}'
  }
];

// 递归处理目录
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (extensions.includes(path.extname(file))) {
      processFile(filePath);
    }
  });
}

// 处理单个文件
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  replacements.forEach(rule => {
    if (rule.pattern.test(content)) {
      content = content.replace(rule.pattern, rule.replacement);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 修复: ${filePath}`);
  }
}

// 执行
console.log('开始修复API调用...\n');
directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`处理目录: ${dir}`);
    processDirectory(dir);
  }
});
console.log('\n✅ 修复完成！');
console.log('提示：请确保设置环境变量 REACT_APP_API_URL');