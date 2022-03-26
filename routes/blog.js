const express = require("express");
const path = require("path")
const pool = require("../config");

router = express.Router();

// For tutorial 1
router.post("/blogs/addlike/:blogId", async function (req, res, next) {
  //ทำการ select ข้อมูล blog ที่มี id = req.params.blogId
  try{
    const [rows, fields] = await pool.query("SELECT * FROM blogs WHERE id=?", [req.params.blogId,]);
    //ข้อมูล blog ที่เลือกจะอยู่ในตัวแปร rows
    console.log('Selected blogs =', rows)
    //สร้างตัวแปรมาเก็บจำนวน like ณ ปัจจุบันของ blog ที่ select มา
    let likeNum = rows[0].like
    console.log('Like num =', likeNum) // console.log() จำนวน Like ออกมาดู
  //เพิ่มจำนวน like ไปอีก 1 ครั้ง
    likeNum += 1
  
  //Update จำนวน Like กลับเข้าไปใน DB
  const [rows2, fields2] = await pool.query("UPDATE blogs SET blogs.like=? WHERE blogs.id=?", [likeNum, req.params.blogId,]);
   // return json response
    //Redirect ไปที่หน้า index เพื่อแสดงข้อมูล
    res.redirect('/');
    } catch (err) {
      return next(err);
    }
  });

// For tutorial 2
router.get("/blogs/search", async function (req, res, next) {
    // Your code here
    try{
      // ค้นหาใน field title ของตาราง blogs โดยใช้ SELECT * FROM blogs WHERE title LIKE '%คำค้นหา%'
      const [rows, fields] = await pool.query("SELECT * FROM blogs WHERE title LIKE ?", [
        `%${req.query.search}%`,
      ]);
      // return json ของรายการ blogs
      return res.json(rows);
  
    } catch (err) {
      console.log(err)
      return next(err);
    }
  });

// For inserting new blog
router.get("/create", async function (req, res, next) {
  // Your code here
  console.log(req.body)
  res.render("blogs/create")
});

// For blog detail page
router.get("/detail/:blogId", async function (req, res, next) {
  // Your code here
  const [rows, field] = await pool.query(
    `SELECT * FROM blogs WHERE id = ?`,
    [req.params.blogId]
  )
  const [rows2, field2] = await pool.query(
    `SELECT * FROM images WHERE blog_id = ?`,
    [req.params.blogId]
  )

  const [rows3, field3] = await pool.query(
    `SELECT * FROM comments WHERE blog_id = ?`,
    [req.params.blogId]
  )
  res.render("blogs/detail", {
    blog: JSON.stringify(rows[0]),
    Image: JSON.stringify(rows2),
    comments: JSON.stringify(rows3)
  })
});

// For updating blog
router.put("/update/:blogId", function (req, res) {
  // Your code here
});

// For deleting blog
router.delete("/delete/:id", function (req, res) {
  // Your code here
});

module.exports = router;
