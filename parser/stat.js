var iconv = require('iconv-lite');
var fs= require('fs');

var request = require('request');
var j = request.jar();
var request = request.defaults({jar: true});

var domain='http://bbs.ngacn.cc';
var cookieSource='ngacookie.json';
var answerSource='correctAnswer_json.txt';
var page='&page=';
var url='http://bbs.ngacn.cc/read.php?tid=8055345&lite=js';

var startPage=1;//pages range
var endPage=13;
var asynchroFlag=0;//finish flag,==page num means finish

var min_answerN=20;//filter answer
var max_answerN=40;

var correctAnswer;
var statRes=[];
var srN=0;

fs.readFile(answerSource,'utf-8',function(err,data){
	if(err){
		console.error(err);
	}
	else{//step A: read cookie to login
		correctAnswer=JSON.parse(data);
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
			            	for(var j=0;j<cutsheet.length;j++){//cut into answer,for each answer line
			            		if(cutsheet[j]==undefined)continue;
			            		if(cutsheet[j].match(/^\s*\d+[,，.、。:：\s]*/)){//match prefix of nn.xxx,is an answer line
			            			answersheet[asN]=cutsheet[j].replace(/^\s*\d+[,，.、。:：\s]*/,'')//rule1: replace the order number 
			            			                            .replace(/\s{4,}.*/,'')//rule2: replace annotation(words after 3 blanks)
			            			                            .replace(/\[del\].*\[\/del\]/g,'')//rule3: replace del
			            			                            .replace(/\(.*\)/g,'')//rule4: replace brackets
			            			                            .replace(/[?？.。、,，\s]*$/,''); //rule5: replace suffix blanks,dots.
			            			          
			            			asN++;
			            			//console.log(cutsheet[j]+' Y');
			            		}
			            		else{
			            			//console.log(cutsheet[j]+' N');
			            		}
			            	}
			            	if(asN<min_answerN||asN>max_answerN)//filter answer
			            		continue;
			            	
			            	//step E analyse
			            	var correctN=0;
			            	for(var j=0;j<asN;j++){//do sth. check correct rate
			            		console.log(answersheet[j]+' '+(correctAnswer[j][answersheet[j]]==undefined?'false':'true'));
			            		if(correctAnswer[j][answersheet[j]]==undefined)
			            			continue;
			            		else {
			            			correctN++;
			            		}
			            	}
			            	var aid=jobj.data.__R[i].authorid;
			            	var aname=jobj.data.__U[jobj.data.__R[i].authorid].username;
			            	var postdate=jobj.data.__R[i].postdate;
			            	var thefloor=jobj.data.__R[i].lou;
			            	var editstamp;
			            	if(jobj.data.__R[i].alterinfo)
			            		editstamp=jobj.data.__R[i].alterinfo.replace(/^\[E?/,'').replace(/\s\S+\s\S+\]\s*$/,'');
			            	else editstamp=jobj.data.__R[i].postdatetimestamp;
			            	console.log("Correct: "+correctN+'  UID: '+aid+'  User: '+aname+'  PostDate: '+postdate+'  EditStamp：'+editstamp+'  thePage: '+(Math.floor(thefloor/20)+1)+'  theFloor: '+thefloor);
			            	console.log("===");
			            	statRes[srN]={};
			            	statRes[srN].correctN=correctN;
			            	statRes[srN].aid=aid;
			            	statRes[srN].aname=aname;
			            	statRes[srN].editstamp=editstamp;
			            	statRes[srN].pN=Math.floor(thefloor/20)+1;
			            	statRes[srN].thefloor=thefloor;
			            	srN++;
			            	//step E finish
			            }
			            //step C finish

			            asynchroFlag++;//asynchroFlag base on finished page num
		            	console.log("finished pages: "+asynchroFlag);
		            	if(asynchroFlag==endPage-startPage+1){//write back after all asynchro finish
		            		statRes.sort(function(a,b){
		            			return a.thefloor-b.thefloor;
		            			//return (a.correctN==b.correctN)?(a.editstamp-b.editstamp):(b.correctN-a.correctN);
		            		});
		            		for(var n=0;statRes[n];n++){
		            			console.log(statRes[n].thefloor+" Correct: "+statRes[n].correctN+'  UID: '+statRes[n].aid+'  User: '+statRes[n].aname+'  EditStamp：'+statRes[n].editstamp+'  thePage: '+statRes[n].pN+'  theFloor: '+statRes[n].thefloor);
		            		}
		            	}
					});
				}
			}
		});
	}
});