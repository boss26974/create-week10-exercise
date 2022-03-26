const express = require("express");
const path = require("path");
const pool = require("../config");

router = express.Router();

// Require multer for file upload
const multer = require("multer");
// SET STORAGE
var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./static/uploads");
  },
  filename: function (req, file, callback) {
    callback(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage });

// For tutorial 1
router.post("/blogs/addlike/:blogId", async function (req, res, next) {
  //ทำการ select ข้อมูล blog ที่มี id = req.params.blogId
  try {
    const [rows, fields] = await pool.query("SELECT * FROM blogs WHERE id=?", [
      req.params.blogId,
    ]);
    //ข้อมูล blog ที่เลือกจะอยู่ในตัวแปร rows
    console.log("Selected blogs =", rows);
    //สร้างตัวแปรมาเก็บจำนวน like ณ ปัจจุบันของ blog ที่ select มา
    let likeNum = rows[0].like;
    console.log("Like num =", likeNum); // console.log() จำนวน Like ออกมาดู
    //เพิ่มจำนวน like ไปอีก 1 ครั้ง
    likeNum += 1;

    //Update จำนวน Like กลับเข้าไปใน DB
    const [rows2, fields2] = await pool.query(
      "UPDATE blogs SET blogs.like=? WHERE blogs.id=?",
      [likeNum, req.params.blogId]
    );
    // return json response
    //Redirect ไปที่หน้า index เพื่อแสดงข้อมูล
    res.redirect("/");
  } catch (err) {
    return next(err);
  }
});

// For tutorial 2
router.get("/blogs/search", async function (req, res, next) {
  // Your code here
  try {
    // ค้นหาใน field title ของตาราง blogs โดยใช้ SELECT * FROM blogs WHERE title LIKE '%คำค้นหา%'
    const [rows, fields] = await pool.query(
      "SELECT * FROM blogs WHERE title LIKE ?",
      [`%${req.query.search}%`]
    );
    // return json ของรายการ blogs
    return res.json(rows);
  } catch (err) {
    console.log(err);
    return next(err);
  }
});

// For inserting new blog
router.get("/create", async function (req, res, next) {
  // Your code here
  console.log(req.body);
  res.render("blogs/create");
});

// For blog detail page
router.get("/detail/:blogId", async function (req, res, next) {
  // Your code here
  const [rows, field] = await pool.query(`SELECT * FROM blogs WHERE id = ?`, [
    req.params.blogId,
  ]);
  const [rows2, field2] = await pool.query(
    `SELECT * FROM images WHERE blog_id = ?`,
    [req.params.blogId]
  );

  const [rows3, field3] = await pool.query(
    `SELECT comments.id,comments.comment, comments.like, comments.comment_date, comments.comment_by_id, comment_images.id as \`image_id\`, comment_images.file_path as \`img_address\`
    FROM comments
    LEFT JOIN comment_images ON comments.id=comment_images.comment_id
    WHERE blog_id = ?`,
    [req.params.blogId]
  );

  const [rows4, _] = await pool.query(
    `SELECT * FROM comment_images`
  );

  res.render("blogs/detail", {
    blog: JSON.stringify(rows[0]),
    Image: JSON.stringify(rows2),
    comments: JSON.stringify(rows3),
  });
});

// For updating blog
router.put("/update/:blogId", function (req, res) {
  // Your code here
});

// For deleting blog
router.delete("/delete/:id", function (req, res) {
  // Your code here
});

router.post(
  "/blogs",
  upload.single("myImage"),
  async function (req, res, next) {
    // create code here
    const file = req.file;

    if (!file) {
      const error = new Error("Please upload a file");
      error.httpStatusCode = 400;
      return next(error);
    }

    const title = req.body.title;
    const content = req.body.content;
    const status = req.body.status;
    const pinned = req.body.pinned;

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      let results = await conn.query(
        "INSERT INTO blogs(title, content, status, pinned, `like`,create_date) VALUES(?, ?, ?, ?, 0,CURRENT_TIMESTAMP);",
        [title, content, status, pinned]
      );

      const blogId = results[0].insertId;

      await conn.query("INSERT INTO images(blog_id, file_path) VALUES(?, ?);", [
        blogId,
        file.path.substr(6),
      ]);

      conn.commit();
      res.send("success!");
    } catch (error) {
      await conn.rollback();
      return next(error);
    } finally {
      console.log("finally");
      conn.release();
    }
  }
);

router.put("/blogs/:id", upload.single("myImage"), async (req, res, next) => {
  // update blog code here
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const file = req.file;

    if (file) {
      await conn.query("UPDATE images SET file_path=? WHERE id=?", [
        file.path,
        req.params.id,
      ]);
    }
    await conn.query(
      "UPDATE blogs SET title=?,content=?, pinned=?, blogs.like=?, create_by_id=? WHERE id=?",
      [
        req.body.title,
        req.body.content,
        req.body.pinned,
        req.body.like,
        null,
        req.params.id,
      ]
    );
    conn.commit();
    res.json({ message: "Update Blog id " + req.params.id + " Complete" });
  } catch (error) {
    await conn.rollback();
    return next(error);
  } finally {
    console.log('finally')
    conn.release();
  }
});

router.delete('/blogs/:id', async (req, res, next) => {

  const conn = await pool.getConnection()
  await conn.beginTransaction();

  try {
    // check blog has comment?
    let comments = await conn.query('SELECT * FROM comments WHERE blog_id=?', [req.params.id])

    if (comments[0].length > 0) {
      res.status(409).json({ message: "Can't Delete because this blog has comment!!!" })
    } else {
      await conn.query('DELETE FROM blogs WHERE id=?;', [req.params.id]) // delete blog
      await conn.query('DELETE FROM images WHERE blog_id=?;', [req.params.id]) // delete image
      await conn.commit()
      res.json({ message: 'Delete Blog id ' + req.params.id + ' complete' })
    }
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    console.log('finally')
    conn.release();
  }
});

module.exports = router;
