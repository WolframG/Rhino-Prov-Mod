var PolicyConfig = {
  rootDir : "",
  lockDir : "./Locks/"
}

if(global && typeof print !== "function"){
  module.exports = PolicyConfig;
}
