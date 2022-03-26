const express = require("express");
const path = require("path");
const pool = require("../config");
const router = express.Router();

const replace = require('replace')

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

// Create comment
router.post(
  "/:blogId/comments",
  upload.single("myImage"),
  async function (req, res, next) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const file = req.file;

      if (!file) {
        file = null
      }

      let comment_by_id = req.body.comment_by_id;
      if (isNaN(comment_by_id)) {
        comment_by_id = null;
      }

      const [rows, fields] = await pool.query(
        `INSERT INTO comments (comments.blog_id, comments.comment, comments.like, comments.comment_by_id)
            VALUES (?, ?, ?, ?)`,
        [req.params.blogId, req.body.comment, 0, comment_by_id]
      );

      const commentId = rows.insertId

      await conn.query("INSERT INTO comment_images(comment_id, file_path) VALUES(?, ?);", [
        commentId,
        file.path.substr(6).replace(/\\/g,'/'),
      ]);

      conn.commit();
      res.redirect("/detail/" + req.params.blogId);
    } catch (err) {
      conn.rollback();
      return next(err);
    } finally {
      console.log("เพิ่ม comment เรียบร้อยแล้ว");
      conn.release();
    }
  }
);

// Update comment
router.get("/comments/:commentId", async function (req, res, next) {
  try {
    let comment_by_id = req.body.comment_by_id;
    if (isNaN(comment_by_id)) {
      comment_by_id = null;
    }
    const [rows, fields] = await pool.query(
      `UPDATE comments
            SET blog_id=?, comment=?, comments.like=?, comment_date=?, comment_by_id=?
            WHERE id = ?`,
      [
        req.body.blog_id,
        req.body.comment,
        req.body.like,
        req.body.comment_date,
        comment_by_id,
        req.params.commentId,
      ]
    );
    const [rows2, fields2] = await pool.query(
      `SELECT comment, c.like, comment_date, comment_by_id, blog_id
            FROM comments c
            WHERE id = ?`,
      [req.params.commentId]
    );
    res.send(rows2[0]);
  } catch (err) {
    console.log(err);
  }
});


// Delete comment
router.post("/comments/:commentId", async function (req, res, next) {
  try {
    await pool.query(`DELETE FROM comments WHERE id = ?`, [
      req.params.commentId,
    ]);
  } catch (err) {
    console.log(err);
  }
});

// Delete comment
router.post("/comments/addlike/:commentId/", async function (req, res, next) {
  try {
    await pool.query(
      `UPDATE comments
            SET comments.like=(comments.like + 1)
            WHERE comments.id = ?`,
      [req.params.commentId]
    );
    const [rows, fields] = await pool.query(
      `SELECT blog_id as 'blogId', id as 'commentId', comments.like as 'likeNum'
            FROM comments
            WHERE id = ?`,
      [req.params.commentId]
    );
  } catch (err) {
    console.log(err);
  }
});

exports.router = router;
