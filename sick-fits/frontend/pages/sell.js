import Link from 'next/link';
import CreateItem from '../components/CreateItem';
import PleaseSignIn from '../components/PleaseSingIn';

const Sell = props => (
  <div>
    <PleaseSignIn>
      <h2>Sell Page!</h2>
      <CreateItem />
    </PleaseSignIn>
  </div>
)

export default Sell;