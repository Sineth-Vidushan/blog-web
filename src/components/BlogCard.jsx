import { Link } from "react-router-dom";

export default function BlogCard({ post }) {
  return (
    <div style={{
      border: "1px solid #ccc",
      padding: "10px",
      margin: "10px 0",
      borderRadius: "5px"
    }}>
      <Link to={`/blogs/${post.id}`}>
        <h3>{post.title}</h3>
      </Link>
      <p>{post.content.slice(0, 100)}...</p>
      <small>Author: {post.authorId}</small>
      

    </div>
  );
}
