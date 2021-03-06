import Link from 'next/link';
import { Mutation } from 'react-apollo';
import User from './User';
import CartCount from './CartCount';
import Signout from './Signout';
import NavStyles from './styles/NavStyles';
import { TOGGLE_CART_STATE_MUTATION } from './Cart';

const Nav = () => (
  <User>
    {({data: { me }} ) => (
      <NavStyles>
        <Link href="/items">
          <a>Shop</a>
        </Link>
        {me && (
          <>
            <Link href="/sell">
              <a>Sell</a>
            </Link>
            <Link href="/orders">
              <a>Orders</a>
            </Link>
            <Link href="/me">
              <a>Account</a>
            </Link>
            <Signout />
            <Mutation mutation={TOGGLE_CART_STATE_MUTATION}>
              { toggleCartState => (
                <button onClick={toggleCartState}>
                  My Cart
                  <CartCount count={me.cart.reduce((tally, cartItem) => tally + cartItem.quantity, 0)}></CartCount>
                </button>
              )}
            </Mutation>
          </>
        )}
        {!me && (
          <Link href="/signup">
            <a>Sign In</a>
          </Link>
        )}
      </NavStyles>

    )}
    </User>
)

export default Nav;