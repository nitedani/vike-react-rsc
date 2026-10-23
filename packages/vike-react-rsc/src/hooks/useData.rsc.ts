// vike-react-rsc/useData in the rsc env, e.g. imported by a server component
import { getPageContext } from "../rsc/scope";

export function useData<Data>(): Data {
  return getPageContext().data as Data;
}
