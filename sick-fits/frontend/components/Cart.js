import React from 'react';
import { Query, Mutation } from 'react-apollo';
import gql from 'graphql-tag';
import { adopt } from 'react-adopt';
import User from './User';
import CartItem from './CartItem';
import calcTotalPrice from '../lib/calcTotalPrice';
import formatMoney from '../lib/formatMoney';
import SickButton from './styles/SickButton';
import CartStyles from './styles/CartStyles';
import Supreme from './styles/Supreme';
import CloseButton from './styles/CloseButton';

const CART_STATE_QUERY = gql`
  query {
    cartState @client
  }
`;

const TOGGLE_CART_STATE_MUTATION = gql`
  mutation {
    toggleCartState @client
  }
`;

const Composed = adopt({
  user: ({ render }) => <User>{ render }</User>,
  toggleCartState: ({ render }) => <Mutation mutation={TOGGLE_CART_STATE_MUTATION}>{ render }</Mutation>,
  localCartState: ({ render }) => <Query query={CART_STATE_QUERY}>{ render }</Query>
})

const Cart = () => (
  <Composed>
    {({user, toggleCartState, localCartState}) => {
      const me = user.data.me;
      if(!me) return null;
      return(
        <CartStyles open={localCartState.data.cartState}>
          <header>
            <CloseButton onClick={toggleCartState} title="close">
              &times;
            </CloseButton>
            <Supreme>{me.name}'s Cart</Supreme>
            <p>You Have {me.cart.length} Item{me.cart.length === 1 ? '' : 's'} in your cart.</p>
          </header>
          <ul>
            {me.cart.map(cartItem => <CartItem key={cartItem.id} cartItem={cartItem} />)}
          </ul>

          <footer>
            <p>{formatMoney(calcTotalPrice(me.cart))}</p>
            <SickButton>Checkout</SickButton>
          </footer>
        </CartStyles>
      )
    }}
  </Composed>
);

export default Cart;
export {
  CART_STATE_QUERY,
  TOGGLE_CART_STATE_MUTATION
}