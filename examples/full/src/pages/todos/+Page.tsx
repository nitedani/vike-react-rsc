import { getTodos } from "../../actions/addTodo";
import { Todos } from "../../components/Todos";

export async function Page() {
  const todos = await getTodos();
  return (
    <div>
      <h1>Todos</h1>
      <a href="/">Go to home</a>
      <div>
        <Todos todos={todos} />
      </div>
    </div>
  );
}
