const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
const toDate = require("date-fns/toDate");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server started at http://localhost3000");
    });
  } catch (e) {
    console.log(`DB ERROR: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const checkQueryParameters = async (request, response, next) => {
  const { search_q, status, priority, category, date } = request.query;
  const { todoId } = request.params;

  if (status !== undefined) {
    const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
    const isItemFound = statusValues.includes(status);
    if (isItemFound === true) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }

  if (priority !== undefined) {
    const priorityValues = ["HIGH", "MEDIUM", "LOW"];
    const isItemFound = priorityValues.includes(priority);
    if (isItemFound === true) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }

  if (category !== undefined) {
    const categoryValues = ["WORK", "HOME", "LEARNING"];
    const isItemFound = categoryValues.includes(category);
    if (isItemFound === true) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }

  if (date !== undefined) {
    try {
      const myDate = new Date(date);
      const formatedDate = format(new Date(date), "yyyy-MM-dd");
      const result = toDate(
        new Date(
          `${myDate.getFullYear()}-${myDate.getMonth() + 1}-${myDate.getDate()}`
        )
      );
      const isValidDate = await isValid(result);
      if (isValidDate === true) {
        request.date = formatedDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        return;
      }
    } catch (e) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }

  request.search_q = search_q;
  request.todoId = todoId;

  next();
};

const checkRequestBody = async (request, response, next) => {
  const { id, todo, status, priority, category, dueDate } = request.body;
  const { todoId } = request.params;
  request.todoId = todoId;
  request.todo = todo;
  request.id = id;

  if (status !== undefined) {
    const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
    const isItemFound = statusValues.includes(status);
    if (isItemFound === true) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }

  if (priority !== undefined) {
    const priorityValues = ["HIGH", "MEDIUM", "LOW"];
    const isItemFound = priorityValues.includes(priority);
    if (isItemFound === true) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }

  if (category !== undefined) {
    const categoryValues = ["WORK", "HOME", "LEARNING"];
    const isItemFound = categoryValues.includes(category);
    if (isItemFound === true) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }

  if (dueDate !== undefined) {
    try {
      const myDate = new Date(dueDate);
      const formatedDate = format(new Date(dueDate), "yyyy-MM-dd");
      const result = toDate(new Date(formatedDate));
      const isValidDate = isValid(result);
      if (isValidDate === true) {
        request.dueDate = formatedDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        return;
      }
    } catch (e) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }
  next();
};

//API: 1;
//Returns todos list based on query parameters
app.get("/todos/", checkQueryParameters, async (request, response) => {
  const { search_q = "", status = "", priority = "", category = "" } = request;

  const getTodosQuery = `
          SELECT 
            id,
            todo,
            priority,
            status,
            category,
            due_date AS dueDate
          FROM 
                todo
          WHERE 
              todo LIKE '%${search_q}%' AND priority LIKE '%${priority}%' 
              AND status LIKE '%${status}%' AND category LIKE '%${category}%';`;

  const todosArray = await db.all(getTodosQuery);
  response.send(todosArray);
});

//API: 2;
//Returns a specific todo based on the todo ID
app.get("/todos/:todoId/", checkQueryParameters, async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
    FROM 
        todo
    WHERE 
        id = ${todoId};`;

  const todoObject = await db.get(getTodoQuery);
  response.send(todoObject);
});

//API: 3;
//Returns a list of all todos with a specific due date in the query parameter /agenda/?date=2021-12-12
app.get("/agenda/", checkQueryParameters, async (request, response) => {
  const { date } = request;
  const getDateQuery = `
          SELECT 
            id,
            todo,
            priority,
            status,
            category,
            due_date AS dueDate
          FROM 
                todo
          WHERE 
               due_date = '${date}';`;

  const todosArray = await db.all(getDateQuery);

  if (todosArray === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    response.send(todosArray);
  }
});

//API: 4;
//Create a todo in the todo table
app.post("/todos/", checkRequestBody, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request;
  const addTodoQuery = `
    INSERT INTO 
        todo (id, todo, priority, status, category, due_date)
    VALUES (
            '${id}',
            '${todo}', 
            '${priority}',
            '${status}',
            '${category}',
            '${dueDate}'
            );`;
  await db.run(addTodoQuery);
  response.send("Todo Successfully Added");
});

//API: 5;
//Updates the details of a specific todo based on the todo ID
app.put("/todos/:todoId/", checkRequestBody, async (request, response) => {
  const { todo, status, priority, category, dueDate } = request;
  const { todoId } = request.params;

  let updateColumn = null;

  switch (true) {
    case status !== undefined:
      updatedColumn = "Status";
      break;
    case priority !== undefined:
      updatedColumn = "Priority";
      break;
    case todo !== undefined:
      updatedColumn = "Todo";
      break;
    case category !== undefined:
      updatedColumn = "Category";
      break;
    case dueDate !== undefined:
      updatedColumn = "Due Date";
      break;
  }

  const updateTodoQuery = `
      UPDATE 
            todo
      SET 
            todo = '${todo}',
            priority = '${priority}',
            status = '${status}',
            category = '${category}',
            due_date = '${dueDate}'
      WHERE 
            id = '${todoId}';`;

  await db.run(updateTodoQuery);
  response.send(`${updatedColumn} Updated`);
});

//API: 6;
//Deletes a todo from the todo table based on the todo ID
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM 
        todo
    WHERE 
        id = '${todoId}';`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
