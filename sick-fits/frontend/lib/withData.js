import withApollo from 'next-with-apollo';
import ApolloClient from 'apollo-boost';
import { endpoint } from '../config';
import { CART_STATE_QUERY } from "../components/Cart";

function createClient({ headers }) {
  return new ApolloClient({
    uri: process.env.NODE_ENV === 'development' ? endpoint : endpoint,
    request: operation => {
      operation.setContext({
        fetchOptions: {
          credentials: 'include',
        },
        headers,
      });
    },

    // Local data
    clientState: {
      resolvers: {
        Mutation: {
          toggleCartState(_, variables, { cache }){
            // Read the state from the cache
            const { cartState } = cache.readQuery({
              query: CART_STATE_QUERY
            });
            // Write the updated state to the cache
            const data = {
              data: { cartState: !cartState }
            };
            cache.writeData(data);
            return data;
          }
        }
      },
      defaults: {
        cartState: false
      }
    }
  });
}

export default withApollo(createClient);
