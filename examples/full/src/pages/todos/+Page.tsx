import { getPageContext } from "vike-react-rsc/pageContext";
import { getTodos } from "../../actions/addTodo";
import { Todos } from "../../components/Todos";

export async function Page() {
  const todos = await getTodos();
  const ctx = getPageContext();
  console.log(ctx.pageId);

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
