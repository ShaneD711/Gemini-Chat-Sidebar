# 🚀 Gemini Chat Sidebar (Gemini 聊天侧边栏导航) 

![Version](https://img.shields.io/badge/Version-1.0-blue?style=flat-square) ![Author](https://img.shields.io/badge/Author-ShaneD711-orange?style=flat-square) ![Platform](https://img.shields.io/badge/Platform-Gemini-green?style=flat-square)

为 Google Gemini 网页版添加一个强大的侧边栏导航，解决长对话浏览困难的问题。

---

## 😫 痛点分析：为什么要用这个？

在使用 Google Gemini 进行长篇对话时，我们经常遇到以下令人头疼的问题：

* **📜 滚动地狱**：随着对话变长，想要找回几分钟前的一段代码或指令，需要疯狂向上滚动鼠标滚轮。
* **🧩 上下文迷失**：加载历史记录时页面经常乱跳，导致找不到刚才读到哪里了。

**Gemini Chat Sidebar** 就是为了解决这些痛点而生的。

---

## ✨ 主要功能

本脚本相当于给你的 Gemini 聊天装了一个“目录大纲”：

* **📑 实时侧边栏目录**：在屏幕右侧（或左侧）自动生成对话节点列表。
* **🎯 点击即达 (Click-to-Scroll)**：点击侧边栏的任意一条记录，主界面自动平滑滚动到该位置，让你一眼锁定目标。
* **🔎 关键词过滤**：侧边栏顶部带有搜索框，输入关键词即可实时筛选目录，快速定位特定内容。
* **🌓 智能主题适配**：自动检测 Gemini 是深色模式还是浅色模式，并无缝切换侧边栏的配色风格。
* **🧱 拖拽调整宽度**：鼠标悬停在侧边栏边缘即可拖拽调整宽度，适应不同屏幕大小。
* **⬆️ 历史记录增强**：提供 `Load History` 按钮，自动向上滚动加载旧消息。
* **👁️ 实时阅读追踪**：当你滚动主页面时，侧边栏会自动高亮显示你当前正在阅读的段落。

---

## 🛠️ 安装方法

本工具是一个 **UserScript (用户脚本)**，需要配合浏览器扩展程序使用。

### 第 1 步：安装脚本管理器
请根据你的浏览器安装以下任一扩展：
* **Chrome/Edge**: [Tampermonkey (油猴)](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) 或 Violentmonkey
* **Firefox**: Tampermonkey 或 Greasemonkey

### 第 2 步：添加脚本
1.  点击浏览器右上角的 Tampermonkey 图标。
2.  选择 **“添加新脚本” (Create a new script)**。
3.  删除编辑器中默认生成的所有代码。
4.  将本项目中的 `Gemini-Chat-Sidebar.user.js` 代码复制并粘贴进去。
5.  按下 `Ctrl + S` (或 `Cmd + S`) 保存。

### 第 3 步：开始使用
刷新 [Gemini 官网](https://gemini.google.com/)，你将看到屏幕边缘出现了一个侧边栏切换按钮。

---


## 🤝 贡献与致谢

* **原作者**: ShaneD711
* **Namespace**: https://github.com/ShaneD711

如果你发现 Bug 或有改进建议，欢迎 Fork 本项目或提交 Issue。

---
