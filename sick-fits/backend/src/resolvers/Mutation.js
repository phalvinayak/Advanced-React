const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const {transport, makeANiceEmail} = require('../mail');
const { hasPermission } = require('../utils')

const Mutations = {
  async createItem(parent, args, ctx, info){
    // TODO: Check if they're logged in
    if(!ctx.request.userId){
      throw new Error('You must be logged in to do that!');
    }
    const item = await ctx.db.mutation.createItem({
      data: {
        // This is how we create a relationship between the Item and User
        user: {
          connect: {
            id: ctx.request.userId
          }
        },
        ...args
      }
    }, info);
    return item;
  },

  updateItem(parent, args, ctx, info){
    // First take a copy of the update
    const updates = { ...args };
    // Remove the ID from the updates
    delete updates.id;
    // Run the update mutation
    return ctx.db.mutation.updateItem({
      data: updates,
      where: {
        id: args.id
      }
    }, info);
  },

  async deleteItem(parent, args, ctx, info){
    const where = { id: args.id };
    // 1. Find the item
    const  item = await ctx.db.query.item({ where }, `{id, title, user { id }}`)
    // 2. Check if they own that item or have permission
    const ownsItem = item.user.id === ctx.request.userId;
    const hasPermissions = ctx.request.user.permissions.some(permission => ['ADMIN', 'ITEMDELETE'].includes(permission));
    if(ownsItem && hasPermission){
      // 3. Delete it
      return ctx.db.mutation.deleteItem({ where }, info);
    } else {
      throw new Error('You don\'t has permission to delete item');
    }

  },

  async signup(parent, args, ctx, info) {
    // Lowercase their email
    args.email = args.email.toLowerCase();
    // Hash their password
    const password = await bcrypt.hash(args.password, 10);
    // Create a user in the database
    const user = await ctx.db.mutation.createUser({
      data: {
        ...args,
        password,
        permissions: { set: ['ADMIN'] }
       }
    }, info);
    // Create the JWT token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // We set the jwt as a cookie on the response.
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 3110400000 // 1000 * 60 * 60 * 24 * 365 = 1 Year
    });
    return user;
  },

  async signin(parent, { email, password }, ctx, info){
    // 1. Check if there is a user with that email
    const user = await ctx.db.query.user({ where: { email }});
    if(!user) {
      throw new Error(`No user found for email ${email}`);
    }
    // 2. Check if their password is correct
    const valid = await bcrypt.compare(password, user.password);
    if(!valid){
      throw new Error(`Invalid Password!`);
    }
    // 3. Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // 4. Set the cookie with the token
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 3110400000 // 1000 * 60 * 60 * 24 * 365 = 1 Year
    });
    // 5. Return the user
    return user;
  },

  signout(parent, args, ctx, info){
    ctx.response.clearCookie('token');
    return {message: 'Goodbye!'};
  },

  async requestReset(parent, args, ctx, info){
    // 1. Check if this is a real user
    const user = await ctx.db.query.user({ where: { email: args.email }});
    if(!user){
      throw new Error(`No such user found for email ${args.email}`);
    }
    // 2. Set a reset token and expiry on that user
    const promisifiedRandomBytes = promisify(randomBytes);
    const resetToken = (await promisifiedRandomBytes(20)).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 Hour from now
    const res = await ctx.db.mutation.updateUser({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry }
    });
    console.log(res);
    // 3. Email them that reset token
    const mailRes = await transport.sendMail({
      from: 'vinayak@react.com',
      to: user.email,
      subject: 'Your Password Reset Token',
      html: makeANiceEmail(`Your Password Reset Toke is here!
      \n\n
      <a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">Click here to reset.</a>`),
    });
    return {message: 'Reset token sent to your email id'};
  },

  async resetPassword(parent, args, ctx, info){
    // 1. Check if the password matches
    if(args.password !== args.confirmPassword){
      throw new Error('Yo, password don\'t match');
    }
    // 2. Check if its a legit reset token
    // 3. Check if its expired
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000
      }
    });
    if(!user){
      throw new Error('This token is either invalid or expired');
    }
    // 4. Hash their new password
    const password = await bcrypt.hash(args.password, 10);
    // 5. Save the new password to the user and remote old resetToken fields
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { id: user.id },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null
      }
    })
    // 6. Generate GWT
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
    // 7. Set the GWT cookie
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 3110400000 // 1000 * 60 * 60 * 24 * 365 = 1 Year
    });
    // 8. return the user
    return updatedUser;
  },

  async updatePermissions(parent, args, ctx, info){
    // 1. Check if they are logged in
    if(!ctx.request.userId) {
      throw new Error('You must be logged in!');
    }
    // 2. Query the current user
    const currentUser = ctx.request.user;

    // 3. Check if they have permissions to do so
    hasPermission(currentUser, ['ADMIN', 'PERMISSIONUPDATE']);

    // 4. Update the permissions
    return ctx.db.mutation.updateUser({
      data: {
        permissions: {
          set: args.permissions
        }
      },
      where: {
        id: args.userId
      }
    }, info);
  },

  async addToCart(parent, args, ctx, info){
    // 1. Make sure they're signed in
    const userId = ctx.request.userId;
    if(!userId) {
      throw new Error('You must be logged in!');
    }
    // 2. Query the users current cart
    const [existingCartItem] = await ctx.db.query.cartItems({
      where: {
        user: { id: userId },
        item: { id: args.id }
      }
    });
    // 3. Check if the item is already in their cart and increment by 1 if it is
    if(existingCartItem){
      console.log('This item is already in their cart');
      return ctx.db.mutation.updateCartItem({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + 1 }
      }, info);
    }
    // 4. If its not create a fresh cart item for that user
    return ctx.db.mutation.createCartItem({
      data: {
        user: {
          connect: { id: userId }
        },
        item: {
          connect: { id: args.id }
        }
      }
    }, info);
  },

  async removeFromCart(parent, args, ctx, info){
    // 1. Find the cart item
    const cartItem = await ctx.db.query.cartItem({
      where: { id: args.id }
    }, `{id, user {id}}`);
    if(!cartItem){
      throw new Error('No cart item found');
    }
    // 2. Make sure they own that cart item
    if(cartItem.user.id !== ctx.request.userId){
      throw new Error('Cheating huhhhh');
    }
    // 3. Delete that cart ite,
    return ctx.db.mutation.deleteCartItem({
      where: { id: args.id }
    });
  }
};

module.exports = Mutations;
