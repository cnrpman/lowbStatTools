var iconv = require('iconv-lite');
var fs= require('fs');

var request = require('request');
var j = request.jar();
var request = request.defaults({jar: true});

var domain='http://bbs.ngacn.cc';
var cookieSource='ngacookie.json';
var page='&page=';
var url='http://bbs.ngacn.cc/read.php?tid=8055345&lite=js';

var startPage=1;//pages range
var endPage=13;
var asynchroFlag=0;//finish flag,==page num means finish

var min_answerN=20;//filter answer
var max_answerN=40;

var allAnswers=[];
for(var i=0;i<max_answerN;i++)
	allAnswers[i]={};

//step A: read cookie to login
fs.readFile(cookieSource,'utf-8',function(err,data){
	if(err){
		console.error(err);	
	}
	else{
		var rawcookies = JSON.parse(data);
		for(var i=0;rawcookies[i];i++){//all cookies in ngacookie.json(bbs.ngacn.cc) to jar.j
			//console.log(rawcookies[i]);
			j.setCookie(request.cookie(rawcookies[i].name+'='+rawcookies[i].value),domain);
		}

		//step B: crawl 
		for(var pN=startPage;pN<=endPage;pN++){
			request.get({
	       		url:url+page+pN,
				jar:j,
	   		    encoding: null
	   		},function(err,res,body){
	            var res=iconv.decode(body,'GBK');
	            var jstr=res.substring(33).replace(/	/g,'    ');//deal with pitfalls
	            var jobj=JSON.parse(jstr);//return obj got

	            //step C: cut
	            //console.log("this visit rows: "+jobj.data.__T.this_visit_rows);
	            //console.log("pages num: "+Math.floor((jobj.data.__T.this_visit_rows-1)/jobj.data.__R__ROWS_PAGE));
	            //console.log("pages rows: "+jobj.data.__R__ROWS);

	            var tidN=jobj.data.__R__ROWS;
	            for(var i=0;i<tidN;i++){//for each tread

	            	//step D parse
	            	if(jobj.data.__R[i].content==undefined)continue;
	            	var content=jobj.data.__R[i].content.replace(/&nbsp;/g, ' ');//tran spacing
	            	var cutsheet=content.split("<br/>");
	            	var answersheet=[];
	            	var asN=0;
	            	for(var j=0;j<cutsheet.length;j++){//cut into answer
	            		if(cutsheet[j]==undefined)continue;
	            		if(cutsheet[j].match(/^\s*\d+[,，.、。:：\s]*/)){//match prefix of nn.xxx,is an answer line
	            			var seq=/^\s*(\d+)/.exec(cutsheet[j])[1]-1;
			            	if(seq>=max_answerN)continue;
	            			answersheet[seq]=cutsheet[j].replace(/^\s*\d+[,，.、。:：\s]*/,'')//rule1: replace the order number 
	            			                            .replace(/\s{4,}.*/,'')//rule2: replace annotation(words after 3 blanks)
	            			                            .replace(/\[del\].*\[\/del\]/g,'')//rule3: replace del
	            			                            .replace(/\(.*\)/g,'')//rule4: replace brackets
	            			                            .replace(/[?？.。、,，\s]*$/,''); //rule5: replace suffix blanks,dots.
	            			          
	            			asN++;
	            		}
	            	}
	            	if(asN<min_answerN||asN>max_answerN)//filter answer
	            		continue;
	            	console.log(answersheet);
	            	for(var j=0;j<asN;j++){
	            		if(allAnswers[j][answersheet[j]]==undefined)
	            			allAnswers[j][answersheet[j]]=1;
	            		else allAnswers[j][answersheet[j]]++;
	            	}
	            }

	            asynchroFlag++;//asynchroFlag base on finished page num
            	console.log(asynchroFlag);
            	if(asynchroFlag==endPage-startPage+1){
            		fs.writeFile("allAnswers_json.txt", JSON.stringify(allAnswers), function (error) {
						if (error) {
							console.log("write to file error");
						}
					});
            	}
			});
		}
	}
});