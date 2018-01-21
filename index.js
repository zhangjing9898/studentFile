var express = require("express");
var app = express();
session = require('express-session');
var formidable = require("formidable");
var db = require("./model/db");
var path = require("path");
var fs = require("fs");
var md5 = require("./model/md5");
var sd = require("silly-datetime");
var ObjectId = require('mongodb').ObjectID;

//使用session
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));

app.set("view engine", "ejs");

app.use(express.static("./public"));
app.use("/avatar", express.static("./avatar"));


//显示首页
app.get("/", function (req, res, next) {
    if (req.session.login == "1") {
        //如果登陆了
        var username = req.session.username;
        var login = true;
    } else {
        //没有登陆
        var username = "未登录";  //制定一个空用户名
        var login = false;
    }
    res.render("index", {
        "login": login,
        "username": username,
        "active": "首页"
    });
})

//注册页面
app.get("/regist", function (req, res, next) {
    res.render("regist", {
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : "",
        "active": "注册"
    });
});

//登陆页面
app.get("/login", function (req, res, next) {
    res.render("login", {
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : "",
        "active": "登录"
    });
});

//执行注册
app.get("/doregist", function (req, res, next) {
    var dengluming = req.query.dengluming;
    var mima = req.query.mima;
    //加密
    mima = md5(md5(mima).substr(4, 7) + md5(mima));

    db.find("users", {"dengluming": dengluming}, function (err, result) {
        if (err) {
            res.send("-3"); //服务器错误
            return;
        }
        if (result.length != 0) {
            res.send("-1"); //被占用
            return;
        }
        //没有相同的人，就可以执行接下来的代码了：
        //现在可以证明，用户名没有被占用
        //把用户名和密码存入数据库
        db.insertOne("users", {
            "dengluming": dengluming,
            "mima": mima
        }, function (err, result) {
            if (err) {
                res.send("-1");
                return;
            }
            req.session.login = "1";
            req.session.username = dengluming;

            res.send("1"); //注册成功，写入session
        })
    });
});

//更改密码
app.post("/changePasswordTeacher", function (req, res, next) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        console.log(fields);
        var dengluming = fields.dengluming;
        var mima = fields.mima;
        mima = md5(md5(mima).substr(4, 7) + md5(mima));
        db.updateMany("teachers", {"dengluming": dengluming}, {
            $set: {
               "mima":mima
            }
        }, function (err, results) {
            res.send("1");//修改成功
        });
    });
    return;
});

//更改密码
app.post("/changePasswordStudent", function (req, res, next) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        var dengluming = fields.denglumingdefault;
        var mima = fields.mimachange;
        mima = md5(md5(mima).substr(4, 7) + md5(mima));
        db.updateMany("users", {"dengluming": dengluming}, {
            $set: {
                "mima":mima
            }
        }, function (err, results) {
            res.send("1");//修改成功
        });
    });
    return;
});
//changePasswordM
//更改密码
app.post("/changePasswordM", function (req, res, next) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        var dengluming = fields.denglumingdefault;
        var mima = fields.mimachange;
        mima = md5(md5(mima).substr(4, 7) + md5(mima));
        db.updateMany("manager", {"dengluming": dengluming}, {
            $set: {
                "mima":mima
            }
        }, function (err, results) {
            res.send("1");//修改成功
        });
    });
    return;
});
app.post("/dologin", function (req, res, next) {
    var form = new formidable.IncomingForm();
    console.log(form);
    form.parse(req, function (err, fields, files) {
        var dengluming = fields.dengluming;
        var mima = fields.mima;
        var type = fields.loginStyle;
        console.log(fields);
        mima = md5(md5(mima).substr(4, 7) + md5(mima));

        if (type == 'option1') {
            //管理员登录
            //检索数据库，按登录名检索数据库，查看密码是否匹配
            db.find("manager", {"dengluming": dengluming}, function (err, result) {
                if (result.length == 0) {
                    res.send("-2");  //-2没有这个人
                    return;
                }
                var shujukuzhongdemima = result[0].mima;
                //要对用户这次输入的密码，进行相同的加密操作。然后与
                //数据库中的密码进行比对
                if (mima == shujukuzhongdemima) {
                    req.session.login = "1";
                    req.session.username = dengluming;
                    res.send("1000");  //成功
                } else {
                    res.send("-1"); //密码不匹配
                }
            });
        } else if (type == 'option2') {
            //教师登录
            //检索数据库，按登录名检索数据库，查看密码是否匹配
            db.find("teachers", {"dengluming": dengluming}, function (err, result) {

                if (result.length == 0) {
                    res.send("-2");  //-2没有这个人
                    return;
                }
                var shujukuzhongdemima = result[0].mima;
                //要对用户这次输入的密码，进行相同的加密操作。然后与
                //数据库中的密码进行比对
                if (mima == shujukuzhongdemima) {
                    req.session.login = "1";
                    req.session.username = dengluming;
                    res.send("1001");  //成功
                } else {
                    res.send("-1"); //密码不匹配
                }
            });
        } else if (type == 'option3') {
            //检索数据库，按登录名检索数据库，查看密码是否匹配
            db.find("users", {"dengluming": dengluming}, function (err, result) {
                if (result.length == 0) {
                    res.send("-2");  //-2没有这个人
                    return;
                }
                var shujukuzhongdemima = result[0].mima;
                //要对用户这次输入的密码，进行相同的加密操作。然后与
                //数据库中的密码进行比对
                if (mima == shujukuzhongdemima) {
                    req.session.login = "1";
                    req.session.username = dengluming;
                    res.send("1");  //成功
                } else {
                    res.send("-1"); //密码不匹配
                }
            });
        }
    });
    return;
});

//404页面
app.get("/404", function (req, res, next) {
    res.render("404", {
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : "",
        "active": "404"
    });
})

//教师登录页面
app.get("/teacherIndex", function (req, res, next) {
    res.render("teacherIndex", {
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : "",
        "active": "官网详情"
    })
});

//课表上传页面
app.get("/lessonUp", function (req, res, next) {
    res.render("lessonUpPage", {
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : ""
    })
});

//教师档案修整页面
app.get("/searchStudentInfo", function (req, res, next) {
    res.render("searchStudentInfo", {
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : "",
        "active": "奖惩管理"
    })
});

app.get("/message", function (req, res, next) {
    //必须保证登陆
    if (req.session.login != "1") {
        res.end("非法闯入，这个页面要求登陆！");
        return;
    }
    res.render("message", {
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : ""
    });
})

app.get("/search", function (req, res, next) {
    //必须保证登陆
    if (req.session.login != "1") {
        res.end("非法闯入，这个页面要求登陆！");
        return;
    }
    res.render("search", {
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : ""
    });
})

app.get("/table", function (req, res, next) {
    //必须保证登陆
    if (req.session.login != "1") {
        res.end("非法闯入，这个页面要求登陆！");
        return;
    }
    res.render("table", {
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : ""
    });
})

app.get("/taskArea", function (req, res, next) {
    //必须保证登陆
    if (req.session.login != "1") {
        res.end("非法闯入，这个页面要求登陆！");
        return;
    }
    res.render("taskArea", {
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : ""
    });
})

app.get("/userInfo", function (req, res, next) {
    //必须保证登陆
    if (req.session.login != "1") {
        res.end("非法闯入，这个页面要求登陆！");
        return;
    }
    res.render("user-info", {
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : ""
    });
});

//更改资料
app.get("/updata", function (req, res, next) {
    var dengluming = req.query.dengluming;
    var department = req.query.department;
    var teacherId = req.query.teacherId;
    var collegeName = req.query.collegeName;
    var politicalStatus = req.query.politicalStatus;
    var telNum = req.query.telNum;
    var sex = req.query.sex;
    var lesson = req.query.lesson;
    var enterYear = req.query.enterYear;
    var familyInfo = req.query.familyInfo;
    var reallyName = req.query.reallyName;
    var IDnumber = req.query.IDnumber;
    db.find("post", {"dengluming": dengluming}, function (err, result) {
        if (result.length != 0) {
            //用户填写过一次，更改它的值
            db.updateMany("post", {"dengluming": dengluming}, {
                $set: {
                    "teacherId": teacherId,
                    "collegeName": collegeName,
                    "politicalStatus": politicalStatus,
                    "enterYear": enterYear,
                    "telNum": telNum,
                    "sex": sex,
                    "lesson": lesson,
                    "familyInfo": familyInfo,
                    "reallyName": reallyName,
                    "IDnumber": IDnumber,
                    "department": department
                }
            }, function (err, results) {
                res.send("1");//修改成功

            });
            return;
        }
        ;
        db.insertOne("post", {
            "teacherId": teacherId,
            "collegeName": collegeName,
            "politicalStatus": politicalStatus,
            "enterYear": enterYear,
            "telNum": telNum,
            "sex": sex,
            "lesson": lesson,
            "familyInfo": familyInfo,
            "reallyName": reallyName,
            "IDnumber": IDnumber,
            "department": department
        }, function (err, result) {
            if (err) {
                res.send("-1");
                return;
            }
            res.send("1"); //更改成功
        })
    });
});

//更改资料
app.get("/updataTeacher", function (req, res, next) {
    var dengluming = req.query.dengluming;
    var department = req.query.department;
    var teacherId = req.query.teacherId;
    var collegeName = req.query.collegeName;
    var politicalStatus = req.query.politicalStatus;
    var telNum = req.query.telNum;
    var sex = req.query.sex;
    var lesson = req.query.lesson;
    var enterYear = req.query.enterYear;
    var familyInfo = req.query.familyInfo;
    var reallyName = req.query.reallyName;
    var IDnumber = req.query.IDnumber;
    var awardInfo = req.query.awardInfo;
    var punish = req.query.punish;
    db.find("post", {"teacherId": teacherId}, function (err, result) {
        if (result.length != 0) {
            //用户填写过一次，更改它的值
            db.updateMany("post", {"dengluming": dengluming}, {
                $set: {
                    "teacherId": teacherId,
                    "collegeName": collegeName,
                    "politicalStatus": politicalStatus,
                    "enterYear": enterYear,
                    "telNum": telNum,
                    "sex": sex,
                    "lesson": lesson,
                    "familyInfo": familyInfo,
                    "reallyName": reallyName,
                    "IDnumber": IDnumber,
                    "department": department,
                    "awardInfo": awardInfo,
                    "punish": punish
                }
            }, function (err, results) {
                res.send("1");//修改成功

            });
            return;
        }
        ;
        db.insertOne("post", {
            "teacherId": teacherId,
            "collegeName": collegeName,
            "politicalStatus": politicalStatus,
            "enterYear": enterYear,
            "telNum": telNum,
            "sex": sex,
            "lesson": lesson,
            "familyInfo": familyInfo,
            "reallyName": reallyName,
            "IDnumber": IDnumber,
            "department": department,
            "awardInfo": awardInfo,
            "punish": punish
        }, function (err, result) {
            if (err) {
                res.send("-1");
                return;
            }
            res.send("1"); //更改成功
        })
    });
});


//显示修改资料
app.get("/showuserinfo", function (req, res, next) {
    var dengluming = req.query.dengluming;
    db.find("post", {"dengluming": dengluming}, function (err, result) {
        // console.log(result);
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
});

//查询个人档案资料
app.get("/searchUserinfo", function (req, res, next) {
    var studentid = req.query.studentId;
    db.find("post", {"teacherId": studentid}, function (err, result) {
        // console.log(result);
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
});

//显示课程
app.get("/showLesson", function (req, res, next) {
    var dengluming = req.session.username
    db.find("post", {}, function (err, result) {
        // console.log(result);
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
});

//显示成绩
app.get("/searchGrade", function (req, res, next) {
    var studentId = req.query.studentId;
    db.find("grade", {"teacherNum": studentId}, function (err, result) {
        console.log(result);
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
});

//显示修改资料
app.get("/showModal", function (req, res, next) {
    var modalId = req.query.modalId;
    db.find("post", {"_id": ObjectId(modalId)}, function (err, result) {
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
})

//增加课程
app.get("/updataLesson", function (req, res, next) {
    var dengluming = req.query.dengluming
    var lessonTitle = req.query.lessonTitle;
    var lessonDetail = req.query.lessonDetail;
    var lessonLevel = req.query.lessonLevel;
    var lessonPopulation = req.query.lessonPopulation;
    var lessonPath = req.query.lessonPath;
    var lessonImg = req.query.lessonImg == null ? "img/lesson/react.jpg" : req.query.lessonImg
    db.find("lesson", {"dengluming": dengluming}, function (err, result) {
        db.insertOne("lesson", {
            "dengluming": dengluming,
            "lessonImg": lessonImg,
            "lessonTitle": lessonTitle,
            "lessonDetail": lessonDetail,
            "lessonLevel": lessonLevel,
            "lessonPopulation": lessonPopulation,
            "lessonPath": lessonPath
        }, function (err, result) {
            if (err) {
                res.send("-1");
                return;
            }
            res.send("1"); //更改成功
        })
    });
});

//增加资料
app.get("/addReference", function (req, res, next) {
    var dengluming = req.query.dengluming
    var lessonTitle = req.query.lessonTitle;
    var lessonDetail = req.query.lessonDetail;
    var lessonLevel = req.query.lessonLevel;
    var lessonPopulation = req.query.lessonPopulation;
    var lessonPath = req.query.lessonPath;
    var lessonImg = req.query.lessonImg == null ? "img/lesson/react.jpg" : req.query.lessonImg
    db.find("lesson", {"dengluming": dengluming}, function (err, result) {
        db.insertOne("lesson", {
            "dengluming": dengluming,
            "lessonImg": lessonImg,
            "lessonTitle": lessonTitle,
            "lessonDetail": lessonDetail,
            "lessonLevel": lessonLevel,
            "lessonPopulation": lessonPopulation,
            "lessonPath": lessonPath
        }, function (err, result) {
            if (err) {
                res.send("-1");
                return;
            }
            res.send("1"); //更改成功
        })
    });
});

//增加消息
app.get("/addNotion", function (req, res, next) {
    var notionContent = req.query.notionContent;
    db.insertOne("information", {
        "dengluming": "admin",
        "content": notionContent
    }, function (err, result) {
        if (err) {
            res.send("-1");
            return;
        }
        res.send("1"); //更改成功
    })
});

//显示消息
app.get("/showInform", function (req, res, next) {
    db.find("information", {"dengluming": "admin"}, function (err, result) {
        // console.log(result);
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
});

//显示注册过的用户
app.get("/showRefresh", function (req, res, next) {
    db.find("users", {}, function (err, result) {
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
});

//上传课程表
app.post("/upLesson", function (req, res, next) {
    //必须保证登陆
    if (req.session.login != "1") {
        res.end("非法闯入，这个页面要求登陆！");
        return;
    }
    var username = req.session.username;
    var form = new formidable.IncomingForm();
    console.log(form);
    form.uploadDir = path.normalize(__dirname + "/public/download");
    form.parse(req, function (err, fields, files) {
        console.log(files);
        var ttt = sd.format(new Date(), 'YYYY-MM-DD');
        var ran = parseInt(Math.random() * 89999 + 10000);
        var oldpath = files.touxiang.path;
        var name = files.touxiang.name;
        var newpath = path.normalize(__dirname + "/public/download") + "/" + name;
        var optionPath = newpath;
        req.session.optionPath = "http://127.0.0.1:3000/download" + "/" + name;
        fs.rename(oldpath, newpath, function (err) {
            if (err) {
                res.send("失败");
                return;
            }
            var dataNum = parseInt(Math.random() * 100) + 45;
            var upDate = sd.format(new Date(), 'YYYY-MM-DD');
            var downloadNum = parseInt(Math.random() * 100);
            var endDate = "2020-12-30";
            var category = "课表";
            var option = "下载";
            //插入数据到DB中
            db.insertOne("reference", {
                "dataNum": dataNum,
                "dataTitle": name,
                "dataForm": "Word",
                "upDate": upDate,
                "endDate": endDate,
                "downloadNum": downloadNum,
                "category": category,
                "option": option,
                "optionPath": req.session.optionPath
            }, function (err, result) {
                if (err) {
                    res.send("-1");
                    return;
                }
                res.send("上传成功！<a href='/managePage'>回到后台管理页面</a>");
            })
        });
    });
});
//上传课程表
app.post("/upLessonTeacher", function (req, res, next) {
    //必须保证登陆
    if (req.session.login != "1") {
        res.end("非法闯入，这个页面要求登陆！");
        return;
    }
    var username = req.session.username;
    var form = new formidable.IncomingForm();
    console.log(form);
    form.uploadDir = path.normalize(__dirname + "/public/download");
    form.parse(req, function (err, fields, files) {
        console.log(files);
        var ttt = sd.format(new Date(), 'YYYY-MM-DD');
        var ran = parseInt(Math.random() * 89999 + 10000);
        var oldpath = files.touxiang.path;
        var name = files.touxiang.name;
        var newpath = path.normalize(__dirname + "/public/download") + "/" + name;
        var optionPath = newpath;
        req.session.optionPath = "http://127.0.0.1:3000/download" + "/" + name;
        fs.rename(oldpath, newpath, function (err) {
            if (err) {
                res.send("失败");
                return;
            }
            var dataNum = parseInt(Math.random() * 100) + 45;
            var upDate = sd.format(new Date(), 'YYYY-MM-DD');
            var downloadNum = parseInt(Math.random() * 100);
            var endDate = "2020-12-30";
            var category = "课表";
            var option = "下载";
            //插入数据到DB中
            db.insertOne("reference", {
                "dataNum": dataNum,
                "dataTitle": name,
                "dataForm": "Word",
                "upDate": upDate,
                "endDate": endDate,
                "downloadNum": downloadNum,
                "category": category,
                "option": option,
                "optionPath": req.session.optionPath
            }, function (err, result) {
                if (err) {
                    res.send("-1");
                    return;
                }
                res.send("上传成功！<a href='/lessonUp'>回到课程上传页面</a>");
            })
        });
    });
});

//补充资料
app.get("/updataRef", function (req, res, next) {
    //接收其他参数
    var dataNum = req.query.dataNum;
    var dataTitle = req.query.dataTitle;
    var dataForm = req.query.dataForm;
    var upDate = sd.format(new Date(), 'YYYY-MM-DD');
    var downloadNum = parseInt(Math.random() * 100);
    var endDate = req.query.endDate;
    var category = req.query.category;
    var option = "下载";
    var dengluming = "123";
    //插入数据到DB中
    db.find("reference", {"dengluming": dengluming}, function (err, result) {
        db.insertOne("reference", {
            "dengluming": dengluming,
            "dataNum": dataNum,
            "dataTitle": dataTitle,
            "dataForm": dataForm,
            "upDate": upDate,
            "endDate": endDate,
            "downloadNum": downloadNum,
            "category": category,
            "option": option,
            "optionPath": req.session.optionPath
        }, function (err, result) {
            if (err) {
                res.send("-1");
                return;
            }
            res.send("1"); //更改成功
        })
    });
})


//显示注册过的教师
app.get("/showTeacherList", function (req, res, next) {
    db.find("teachers", {}, function (err, result) {
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
});


//课表详情 showLessonTable
app.get("/showLessonTable", function (req, res, next) {
    db.find("reference", {}, function (err, result) {
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
});

//管理员登录后的界面
app.get("/managePage", function (req, res, next) {
    //必须保证登陆
    if (req.session.login != "1") {
        res.end("非法闯入，这个页面只能管理员才能访问！");
        return;
    }
    res.render("ManagePage", {
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : ""
    });
});

//管理员登录
app.get("/managerLogin", function (req, res, next) {
    res.render("managerLogin", {
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : "",
        "active": "管理员登录"
    });
});

//管理员登录
app.post("/doManager", function (req, res, next) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        var dengluming = fields.dengluming;
        var mima = fields.mima;

        //检索数据库，按登录名检索数据库，查看密码是否匹配
        db.find("manager", {"dengluming": dengluming}, function (err, result) {
            if (result.length == 0) {
                res.send("-2");  //-2没有这个人
                return;
            }
            var shujukuzhongdemima = result[0].mima;
            //要对用户这次输入的密码，进行相同的加密操作。然后与
            //数据库中的密码进行比对
            if (mima == shujukuzhongdemima) {
                req.session.login = "1";
                req.session.username = dengluming;
                res.send("1");  //成功
            } else {
                res.send("-1"); //密码不匹配
            }
        });
    });
    return;
});

app.post("/upImg", function (req, res, next) {
    //必须保证登陆
    if (req.session.login != "1") {
        res.end("非法闯入，这个页面要求登陆！");
        return;
    }
    var form = new formidable.IncomingForm();
    form.uploadDir = path.normalize(__dirname + "/public/download");
    form.parse(req, function (err, fields, files) {
        // console.log(files);
        var ttt = sd.format(new Date(), 'YYYY-MM-DD');
        var ran = parseInt(Math.random() * 89999 + 10000);
        var oldpath = files.touxiang.path;
        var name = files.touxiang.name;
        var newpath = path.normalize(__dirname + "/public/download") + "/" + name;
        var optionPath = newpath;
        req.session.optionPath = "http://127.0.0.1:3000/download" + "/" + name;
        fs.rename(oldpath, newpath, function (err) {
            if (err) {
                res.send("失败");
                return;
            }
            res.redirect("/upReference");
        });
    });
});
app.get("/upReference", function (req, res, next) {
    res.render("upReference", {});
});


//补充资料
app.get("/updataRef", function (req, res, next) {
    //接收其他参数
    var dataNum = req.query.dataNum;
    var dataTitle = req.query.dataTitle;
    var dataForm = req.query.dataForm;
    var upDate = sd.format(new Date(), 'YYYY-MM-DD');
    var downloadNum = parseInt(Math.random() * 100);
    var endDate = req.query.endDate;
    var category = req.query.category;
    var option = "下载";
    var dengluming = "123";
    //插入数据到DB中
    db.find("reference", {"dengluming": dengluming}, function (err, result) {
        db.insertOne("reference", {
            "dengluming": dengluming,
            "dataNum": dataNum,
            "dataTitle": dataTitle,
            "dataForm": dataForm,
            "upDate": upDate,
            "endDate": endDate,
            "downloadNum": downloadNum,
            "category": category,
            "option": option,
            "optionPath": req.session.optionPath
        }, function (err, result) {
            if (err) {
                res.send("-1");
                return;
            }
            res.send("1"); //更改成功
        })
    });
})

//管理页面删除用户
app.get("/deleteUser", function (req, res) {
    //接收其他参数
    var deleteid = req.query.deleteid;
    //插入数据到DB中
    db.deleteMany("users", {"_id": ObjectId(deleteid)}, function (err, result) {
        if (err) {
            res.send("-1");
            return;
        }
        res.send("1"); //删除成功
    })
});

//显示成绩资料
app.get("/showGrade", function (req, res, next) {
    db.find("grade", {}, function (err, result) {
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
})

//显示成绩修改资料
app.get("/showGradeModal", function (req, res, next) {
    var gradeModalId = req.query.gardeModalId;
    db.find("grade", {"_id": ObjectId(gradeModalId)}, function (err, result) {
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
})

//显示所有处分资料
app.get("/showPunish", function (req, res, next) {
    db.find("punish", {}, function (err, result) {
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
})

//显示处分修改资料
app.get("/showPunishModal", function (req, res, next) {
    var punishModalId = req.query.punishModalId;
    db.find("punish", {"_id": ObjectId(punishModalId)}, function (err, result) {
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
});

//显示处分修改资料
app.get("/showPunishInfoModal", function (req, res, next) {
    var punishModalId = req.query.punishModalId;
    db.find("punish", {"studentNumber": punishModalId}, function (err, result) {
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        res.json(result);
    })
});

//提交成绩修改
app.get("/updataGrade", function (req, res, next) {
    var _id = req.query._id;
    var studentName = req.query.studentName;
    var tableDate = req.query.tableDate;
    var teacherName = req.query.teacherName;
    var teacherNum = req.query.teacherNum;
    var studyTime = req.query.studyTime;
    var lessonCategory = req.query.lessonCategory;
    var allTime = req.query.allTime;
    db.find("grade", {"_id": ObjectId(_id)}, function (err, result) {
        if (result.length != 0) {
            //用户填写过一次，更改它的值
            db.updateMany("grade", {"_id": ObjectId(_id)}, {
                $set: {
                    "studentName": studentName,
                    "tableDate": tableDate,
                    "teacherName": teacherName,
                    "teacherNum": teacherNum,
                    "studyTime": studyTime,
                    "lessonCategory": lessonCategory,
                    "allTime": allTime
                }
            }, function (err, results) {
                res.send("1");//修改成功

            });
            return;
        }
        ;
        res.send("-1"); //错误！
    });
});

//提交处分修改
app.get("/updataPunish", function (req, res, next) {
    var _id = req.query._id;
    var studentName = req.query.studentName;
    var studentNumber = req.query.studentNumber;
    var punishDate = req.query.punishDate;
    var punishDetail = req.query.punishDetail;
    var punishResult = req.query.punishResult;
    db.find("punish", {"_id": ObjectId(_id)}, function (err, result) {
        if (result.length != 0) {
            //用户填写过一次，更改它的值
            db.updateMany("punish", {"_id": ObjectId(_id)}, {
                $set: {
                    "studentName": studentName,
                    "studentNumber": studentNumber,
                    "punishDate": punishDate,
                    "punishDetail": punishDetail,
                    "punishResult": punishResult
                }
            }, function (err, results) {
                res.send("1");//修改成功

            });
            return;
        }
        ;
        res.send("-1"); //错误！
    });
});

//删除成绩
app.get("/deleteGrade", function (req, res) {
    //接收其他参数
    var deleteid = req.query.deleteid;
    //插入数据到DB中
    db.deleteMany("grade", {"_id": ObjectId(deleteid)}, function (err, result) {
        if (err) {
            res.send("-1");
            return;
        }
        res.send("1"); //删除成功
    })
});

//新增成绩
app.get("/addGrade", function (req, res, next) {
    var studentName = req.query.studentName;
    var tableDate = req.query.tableDate;
    var teacherName = req.query.teacherName;
    var teacherNum = req.query.teacherNum;
    var studyTime = req.query.studyTime;
    var lessonCategory = req.query.lessonCategory;
    var allTime = req.query.allTime;
    db.insertOne("grade", {
        "studentName": studentName,
        "tableDate": tableDate,
        "teacherName": teacherName,
        "teacherNum": teacherNum,
        "studyTime": studyTime,
        "lessonCategory": lessonCategory,
        "allTime": allTime
    }, function (err, result) {
        if (err) {
            res.send("-1");
            return;
        }
        res.send("1"); //更改成功
    })
});

//新增处分
app.get("/addPunish", function (req, res, next) {
    var studentName = req.query.studentName;
    var studentNumber = req.query.studentNumber;
    var punishDate = req.query.punishDate;
    var punishDetail = req.query.punishDetail;
    var punishResult = req.query.punishResult;
    db.insertOne("punish", {
        "studentName": studentName,
        "studentNumber": studentNumber,
        "punishDate": punishDate,
        "punishDetail": punishDetail,
        "punishResult": punishResult
    }, function (err, result) {
        db.find("post", {"teacherId": studentNumber}, function (err, result) {
            if (err || result.length == 0) {
                res.json("");
                return;
            }
            db.updateMany("post", {"teacherId": studentNumber}, {
                $set: {
                    "punish": punishDetail,
                }
            }, function (err, results) {
                res.send("1");//修改成功

            });
        })
        return
    })
});

//退出
app.get("/exit", function (req, res) {
    delete req.session.username;
    req.session.login = '-1';
    res.redirect('/');
});
app.listen(3000);