import React from 'react';
import { Mutation } from 'react-apollo';
import gql from 'graphql-tag'
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { CURRENT_USER_QUERY } from './User';

const BigButton = styled.button`
  font-size: 3rem;
  background: none;
  border: 0;
  &:hover{
    color: ${props => props.theme.red};
    cursor: pointer;
  }
`;

const REMOVE_FROM_CART_MUTATION = gql`
  mutation REMOVE_FROM_CART($id: ID!){
    removeFromCart(id: $id){
      id
    }
  }
`;

class RemoveFromCart extends React.Component {
  static propTypes = {
    id: PropTypes.string.isRequired
  }

  // this gets called as soon as we get a response back from the server after a mutation has been performed
  update = (cache, payload) => {
    console.log('Running remove from cart function');
    // 1. First read the cache
    const data = cache.readQuery({ query: CURRENT_USER_QUERY });
    // 2. Remove that item from the cart
    const cartItemId = payload.data.removeFromCart.id;
    data.me.cart = data.me.cart.filter(cartItem => cartItem.id !== cartItemId);
    // 3. Write it back to the cache
    cache.writeQuery({query: CURRENT_USER_QUERY, data});
  }

  render(){
    const {id} = this.props;
    return (
      <Mutation
        mutation={REMOVE_FROM_CART_MUTATION}
        variables={{id}}
        update={this.update}
        optimisticResponse={{
          __typename: 'Mutation',
          removeFromCart: {
            __typename: 'CartItem',
            id: this.props.id
          }
        }}
        refetchQueries={ [{ query: CURRENT_USER_QUERY }] }>
          {( removeFromCart, {loading} ) => (
            <BigButton
              title="Delete Item"
              onClick={() => {
                removeFromCart().catch(err => alert(err.message));
              }}
              disabled={loading}>
                &times;
            </BigButton>
          )}
      </Mutation>
    );
  }
}

export default RemoveFromCart;