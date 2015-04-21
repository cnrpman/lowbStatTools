# lowbStatTools  
可以解析二哥的nga接口的阅卷机  

首先要安装node.js环境，iconv-lite模块和request模块  
step1.将自己的ngacookies保存在ngacookie.json中（自行创建），作登陆使用  
step2.运行parser.js，运行结束后会生成allAnswers_json.txt，为所有人的答案。筛选出正确答案后按json格式保存为correctAnswer_json.txt  
step3.运行stat.js

ps.因为网络状况原因，不能完全获取数据时请重试
