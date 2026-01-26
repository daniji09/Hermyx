import { useState, useEffect } from "react";

export function Test() {
  const [message, setMessage] = useState("Loading...");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/test")
      .then((response) => response.json())
      .then((data) => {
        console.log("Data obtained:", data);
        setMessage("Successful connection! Check out the console");
        setUsers(data.data);
      })
      .catch((error) => {
        console.error("Error:", error);
        setMessage("Error connecting to DB :(");
      });
  }, []);

  return (
    <main className="flex flex-col justify-center items-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold text-blue-600">{message}</h1>
      {users.map((user) => (
        <div key={user.uid}>
          {user.username}, {user.email}, {user.password}, {user.google_account},
          {user.description}, {user.name}, {user.surnames}, {user.location}
        </div>
      ))}
    </main>
  );
}
