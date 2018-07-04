import React, { Component } from 'react'
import axios from 'axios'
import './App.css'
class App extends Component {
	
  constructor () {
		super() 
		this.state = {resData: ''}
		this.handleClick1 = this.handleClick1.bind(this)
  }
  
  handleClick1() {
  axios.get('http://localhost:3000/getLatestShopifyOrder').then(response => this.setState({resData: JSON.stringify(response.data)}))
  }
  render () {
    return (
      <div className='button__container'>
        <button className='button' onClick={this.handleClick1}>Get Shopify Order</button>
		<p>{this.state.resData}</p>
      </div>
    )
  }
}


export default App