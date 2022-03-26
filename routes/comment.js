const express = require("express");
const pool = require("../config");
const router = express.Router();

// Get comment
router.post('/:blogId/comments', async function(req, res, next){
    const conn = await pool.getConnection()
    await conn.beginTransaction();

    try{
        let comment_by_id = req.body.comment_by_id
        if(isNaN(comment_by_id)){comment_by_id = null}
        const [rows, fields] = await pool.query(
            `INSERT INTO comments (comments.blog_id, comments.comment, comments.like, comments.comment_by_id)
            VALUES (?, ?, ?, ?)`,
            [req.params.blogId, req.body.comment, 0, comment_by_id])
        conn.commit()
        res.redirect("/detail/" + req.params.blogId)
    }catch(err){
        conn.rollback()
        return next(err)
    }finally {
        console.log("เพิ่ม comment เรียบร้อยแล้ว")
        conn.release()
    }
});

// Update comment
router.put('/comments/:commentId', async function(req, res, next){
    try{
        let comment_by_id = req.body.comment_by_id
        if(isNaN(comment_by_id)){comment_by_id = null}
        const [rows, fields] = await pool.query(
            `UPDATE comments
            SET blog_id=?, comment=?, comments.like=?, comment_date=?, comment_by_id=?
            WHERE id = ?`, 
            [req.body.blog_id, 
            req.body.comment, 
            req.body.like, 
            req.body.comment_date, 
            comment_by_id,
            req.params.commentId])
        const [rows2, fields2] = await pool.query(
            `SELECT comment, c.like, comment_date, comment_by_id, blog_id
            FROM comments c
            WHERE id = ?`, [req.params.commentId]
        )
        res.send({
            message: "Comment ID " + req.params.commentId + " is updated.",
            comment: rows2[0]
        })
    }catch(err){
        console.log(err)
    }
});

// Delete comment
router.delete('/comments/:commentId', async function(req, res, next){
    try{
        await pool.query(
            `DELETE FROM comments WHERE id = ?`, [req.params.commentId]
        )
        res.send({
            message: "Comment ID " + req.params.commentId +" is deleted."
        })
    }
    catch(err){
        console.log(err)
    }
});

// Delete comment
router.put('/comments/addlike/:commentId', async function(req, res, next){
    try{
        await pool.query(
            `UPDATE comments
            SET comments.like=(comments.like + 1)
            WHERE comments.id = ?`, 
            [req.params.commentId]
        )
        const [rows, fields] = await pool.query(
            `SELECT blog_id as 'blogId', id as 'commentId', comments.like as 'likeNum'
            FROM comments
            WHERE id = ?`,
            [req.params.commentId]
        )
        res.send(rows[0])
    }catch(err){
        console.log(err)
    }
});


exports.router = router