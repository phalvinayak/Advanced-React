import { Query } from "react-apollo";
import gql from 'graphql-tag';
import Signin from './Signin';

const SIGNED_IN_USER = gql`
  query SIGNED_IN_USER {
    me {
      id
      email
    }
  }
`;

const PleaseSignIn = props => (
  <Query query={SIGNED_IN_USER}>
    {({ data, loading}) => {
      if(loading) return <p>Loading...</p>
      if(!data.me){
        return (
          <div>
            <p>Please Sign In before Continuing</p>
            <Signin />
          </div>
        )
      }
      return props.children;
    }}
  </Query>
);

export default PleaseSignIn;