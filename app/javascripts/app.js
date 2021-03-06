// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";
import "../stylesheets/request-modal.css";
import "../stylesheets/list-modal.css";
import "../stylesheets/beggar-modal.css";
import "../stylesheets/beggarInfo.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import blockBook_artifacts from '../../build/contracts/BlockBook.json'

// The contract entry point
var ContractFunctions = require('./contractFunctions');
var HashColor = require('./hashColor');
var UIBlocks = require('./uiBlocks');
var Refresh = require('./refresh');
var UI = require('./ui');

// Enum
var AccountRole = {
  Admin: 0,
  Giver: 1,
  Beggar: 2
};

// View
var myAccountRole = AccountRole.Beggar;
var tempStorage = {
   addrs: [],
   requestIndices: [],
   cells: [],
   targetStatus: -1,
};

window.App = {
  start: function() {
    var self = this;
    ContractFunctions.initContract(contract(blockBook_artifacts), web3);

    Refresh.refreshGiverInfo().then(function () {
      return Refresh.refreshBeggarList();
    }).then(function () {
      return Refresh.refreshAdminInfo();
    }).then(function () {
      return self.findMyAccountRole();
    }).then(function () {
      return self.addEventListener(); 
    }).then(function () {
      console.log("TODO: Change this to switch statement for different role");

      self.setupRequestModal();
      self.setupRequestListModal();
      self.setupBeggarModal();
      self.setupBatchButton();

      //self.showGiverDefaultPage();
      //UI.showAddRequestModal();
      //self.showRequestListModal();

      //self.forTesting();      
    });
  },

  forTesting: function () {
    myAccountRole = AccountRole.Giver;
  },

  findMyAccountRole: function () {
    var self = this;

    console.log("!When deployed, change if to else if!");
    var myAccount = ContractFunctions.getMyAccount();
    if (ContractFunctions.isAdmin(myAccount)) {
      console.log("You are Admin");
      self.showAddBeggarModalButton();
      myAccountRole = AccountRole.Admin;
    } if (ContractFunctions.isGiver(myAccount)) {
      console.log("You are Giver");
      myAccountRole = AccountRole.Giver;
    } else if (ContractFunctions.isBeggar(myAccount)){
      console.log("You are Beggar");
      self.showAddRequestModalButton();
      myAccountRole = AccountRole.Beggar;
    }
    self.showDefaultPage();
  },

  showDefaultPage: function () {
    var self = this;

    if (myAccountRole == AccountRole.Admin) {

    } else if (myAccountRole == AccountRole.Giver) {
      console.log("showGiverDefaultPage");
      self.showGiverDefaultPage();
    } else if (myAccountRole == AccountRole.Beggar){
      console.log("showBeggarDefaultPage");
      self.showBeggarDefaultPage();
    }
  },

  showAddRequestModalButton: function () {
    var button = document.getElementsByClassName("addRequest")[0];
    button.addEventListener('click', function () {
        UI.showAddRequestModal();
    });
    button.style.display = "block";
  },

  showAddBeggarModalButton: function () {
    var button = document.getElementsByClassName("addBeggar")[0];
    button.addEventListener('click', function () {
        UI.showAddBeggarModal();
    });
    button.style.display = "block";
  },

  showGiverDefaultPage: function () {
    var self = this;
    self.showBeggarList();

    //TODO: inject beggar modal
  },

  showBeggarDefaultPage: function () {
    var self = this;
    //TODO: inject request modal
    self.showSingleBeggarInfo();
  },

  showSingleBeggarInfo: function () {
    var self = this;

    self.showBeggarList(ContractFunctions.getMyAccount());
    var table = document.getElementById("beggarTable");
    

  },

  showBeggarList: function (address) {
    var self = this;

    var addresses = [];

    if (address != null)
      addresses.push(address);
    else
      addresses = ContractFunctions.getBeggarAddress();
      
    UI.resetBeggarTable(addresses.length);
    var table = document.getElementById("beggarTable");

    addresses.forEach(function(address, index){      
      var beggar = ContractFunctions.getBeggarInfo(address);  

      table.getElementsByClassName("name")[index].innerHTML = beggar.name;
      table.getElementsByClassName("requested")[index].innerHTML = beggar.requested;
      table.getElementsByClassName("approved")[index].innerHTML = beggar.approved;
      table.getElementsByClassName("paid")[index].innerHTML = beggar.paid;
      table.getElementsByClassName("address")[index].value = address;

      // Inject modal showing function
      table.getElementsByClassName("name")[index].addEventListener(
        'click', function () {
        self.showRequestList(address, false, -1);
      });

      table.getElementsByClassName("requested")[index].addEventListener(
        'click', function () {
        self.showRequestList(address, false, ContractFunctions.RequestStatus.PendingApproval);
      });

      table.getElementsByClassName("approved")[index].addEventListener(
        'click', function () {
        self.showRequestList(address, false, ContractFunctions.RequestStatus.Approved);
      });

      table.getElementsByClassName("paid")[index].addEventListener(
        'click', function () {
        self.showRequestList(address, false, ContractFunctions.RequestStatus.Paid);
      });

      var cells = table.children[index].children;
      for(var i = 0; i < cells.length; i++) {
        cells[i].style.backgroundColor = HashColor.hashColor(address, 80+4*i);
      }
      
    });
  },

  showRequestList: function (address, forceRefresh, type) {
    var self = this;
    var infoList = [];
    var statusList = [];
    var beggarInfo;

    var modal = document.getElementsByClassName("list-modal-content")[0];
    var list = modal.getElementsByClassName("formContent")[0];
    
    tempStorage.addrs = [];
    tempStorage.requestIndices = [];
    tempStorage.cells = [];
    tempStorage.targetStatus = -1;

    UI.toggleLoadingModal(true);
    if (ContractFunctions.getBeggarUptodate(address) != true || forceRefresh) {
      beggarInfo = ContractFunctions.getBeggarInfo(address);
      
      Refresh.refreshRequestInfos(address).then(function (sList) {
        var count = 0;

        // Count the number of requests that matches requested type
        if (type == -1) {
          count = sList.length;
        } else {
          sList.forEach(function (status) { 
            if (type == status) {
              count++;
            }
          });  
        }
        
        UI.resetRequestModal(beggarInfo.name, count);
        UI.showRequestListModal();

        var cellIndex = 0;
        sList.forEach(function (status, index) {
          var reverseIndex = sList.length - index - 1;

          if (type != -1 && sList[reverseIndex] != type)
              return;

          var cell = list.getElementsByClassName("requestInfo")[cellIndex];
          Refresh.refreshRequestInfo(beggarInfo.addr, reverseIndex)
            .then(function (info) {
              self.refreshRequestCellInfo(cell, info, sList[reverseIndex]);
            });
          cellIndex++;
        });
      });
    } else {
      var count = 0;
      infoList = ContractFunctions.getBeggarInfo(address).requestList;
      statusList = ContractFunctions.getBeggarInfo(address).requestStatusList;
      beggarInfo = ContractFunctions.getBeggarInfo(address);
      
      // Count the number of requests that matches requested type
      if (type == -1) {
        count = statusList.length;
      } else {
        statusList.forEach(function (status) { 
          if (type == status) {
            count++;
          }
        });  
      }
      
      UI.resetRequestModal(beggarInfo.name, count);
      UI.showRequestListModal();

      var cellIndex = 0;
      var promises = [];
      statusList.forEach(function (status, index) {
        var reverseIndex = statusList.length - index - 1;

        if (type != -1 && statusList[reverseIndex] != type)
          return;

        var cell = list.getElementsByClassName("requestInfo")[cellIndex];
        self.refreshRequestCellInfo(cell, infoList[reverseIndex], statusList[reverseIndex]);
        cellIndex++;
      });
      
    } 
    UI.toggleBatchApproveButton(0);
    UI.toggleLoadingModal(false);
    
  },

  sendAndRefreshRequestCell: function (cell, info, toStatus) {
    var self = this;

    cell.getElementsByClassName("option")[0].innerHTML = "Ready to send...";
    self.changeRequestStatus(info.addr, info.index, toStatus).then(function () {
      cell.getElementsByClassName("option")[0].innerHTML = "Transaction sent";
    }).catch(function (e) {
      console.log(e);
      cell.getElementsByClassName("option")[0].innerHTML
      = "Transaction failed.";                 
    });
  },

  batchSendAndRefreshRequestCell: function (cells, addrs,
   requestIndices, toStatus) {
    var self = this;

    var fun = self.batchApprove;

    if (toStatus == ContractFunctions.RequestStatus.Approved){
      fun = self.batchApprove;      
    } else if (toStatus == ContractFunctions.RequestStatus.Paid) {
      fun = self.batchPaid;
    }
    else
      console.log("???");
  
    cells.forEach(function (cell) {
      cell.getElementsByClassName("option")[0].innerHTML = "Ready to send...";
    });

    fun(addrs, requestIndices).then(function () {
      cells.forEach(function (cell, index) {
        cell.getElementsByClassName("option")[0].innerHTML = "Transaction sent";
      });
    }).catch(function (e) {
      console.log(e);
      cells.forEach(function (cell, index) {
        cell.getElementsByClassName("option")[0].innerHTML = "Transaction failed."; 
      });      
    });   

  },

  batchCommandEventListener: function (cell, info) {
      var inStorage = -1;
    
      if (tempStorage.addrs.length == 0){
        tempStorage.targetStatus 
          = ContractFunctions.getBeggarInfo(info.addr).requestStatusList[info.index];
      }
      else {
        tempStorage.addrs.forEach(function (addr, index) {
          if (addr == info.addr && info.index == tempStorage.requestIndices[index]){
            inStorage = index;
            return;
          }
        });
      }

      if (inStorage >= 0) {            
        tempStorage.addrs.splice(inStorage, 1);
        tempStorage.requestIndices.splice(inStorage, 1);
        tempStorage.cells.splice(inStorage, 1);
        cell.getElementsByClassName("amount")[0].classList.remove("darker");
      }  
      else if (ContractFunctions.getBeggarInfo(info.addr).
          requestStatusList[info.index].valueOf() == tempStorage.targetStatus){
        tempStorage.addrs.push(info.addr);
        tempStorage.requestIndices.push(info.index);
        tempStorage.cells.push(cell);
        cell.getElementsByClassName("amount")[0].className += " darker";
      }
      
      if (tempStorage.addrs.length>0) {
        if (tempStorage.targetStatus == ContractFunctions.RequestStatus.PendingApproval)          
          UI.toggleBatchApproveButton(2);
        else 
          UI.toggleBatchApproveButton(1);     
      } else {
        UI.toggleBatchApproveButton(0);
      }            
  },

  refreshRequestCellInfo: function (cell, info, status) {
    var self = this;

    cell.className = "requestInfo";
    cell.innerHTML = UIBlocks.requestInfo.innerBlock;
    cell.getElementsByClassName("amount")[0].innerHTML = info.amount;
    cell.getElementsByClassName("reason")[0].innerHTML = info.reason;
    cell.getElementsByClassName("address")[0].value = info.addr;
    cell.getElementsByClassName("requestIndex")[0].value = info.index;

    // The receipt has is the hashed string of addr+reason+index+amount % 10000
    cell.getElementsByClassName("additionalInfo")[0].innerHTML = 
      "#"+UI.hashString(info.addr+info.reason+info.index+info.amount) + " - " + 
    UI.timeConverter(info.createdOn);

    var classes = ["amount", "other", "footer"];
    var colorClass = "";
    switch (Number(status)) {
      case ContractFunctions.RequestStatus.PendingApproval:
        colorClass = "green";

        if (myAccountRole != AccountRole.Giver)
          break;

        cell.getElementsByClassName("option")[0].innerHTML 
          = UIBlocks.requestInfo.approvalPendingOptions; 
        cell.getElementsByClassName("approve")[0].addEventListener('click', function () {
          self.sendAndRefreshRequestCell(cell, info, ContractFunctions.RequestStatus.Approved);
        });    
        cell.getElementsByClassName("paid")[0].addEventListener('click', function () {
          self.sendAndRefreshRequestCell(cell, info, ContractFunctions.RequestStatus.Paid);
        });
        cell.getElementsByClassName("reject")[0].addEventListener('click', function () {
          self.sendAndRefreshRequestCell(cell, info, ContractFunctions.RequestStatus.Rejected);
        });
        cell.getElementsByClassName("amount")[0].addEventListener('click', function () {          
          self.batchCommandEventListener(cell, info);
        });
      break;

      case ContractFunctions.RequestStatus.Approved:
        colorClass = "yellow";

        if (myAccountRole != AccountRole.Giver)
          break;

        cell.getElementsByClassName("option")[0].innerHTML 
            = UIBlocks.requestInfo.paymentPendingOptions; 
        cell.getElementsByClassName("paid")[0].addEventListener(      'click', function () {
          self.sendAndRefreshRequestCell(cell, info, ContractFunctions.RequestStatus.Paid);
        });
        cell.getElementsByClassName("amount")[0].addEventListener('click', function () {          
          self.batchCommandEventListener(cell, info);
        });        
      break; 

      case ContractFunctions.RequestStatus.Disputed:
        colorClass = "red";    

        if (myAccountRole != AccountRole.Giver)
          break;

        cell.getElementsByClassName("option")[0].innerHTML 
          = UIBlocks.requestInfo.disputedOptions;        

      break;

      case ContractFunctions.RequestStatus.Removed:
        colorClass = "gray opacity2 strike";    
      break;

      case ContractFunctions.RequestStatus.Paid:
        colorClass = "gray";     
      break;  

      case ContractFunctions.RequestStatus.Rejected:
        colorClass = "gray opacity2 strike";        
      break;                
    }  
    classes.forEach(function (ele) {
      cell.getElementsByClassName(ele)[0].className += " " + colorClass;
    })
  },

  batchApprove: function (addrs, requestIndices) {
    return ContractFunctions.batchApprove(addrs, requestIndices);
  },
  batchPaid: function (addrs, requestIndices) {
    return ContractFunctions.batchPaid(addrs, requestIndices);
  },

  populateRequestList: function (statusList, infoList) {
    var self = this;

    var modal = document.getElementsByClassName("list-modal-content")[0];
    var list = modal.getElementsByClassName("formContent")[0];

    statusList.forEach(function (status, index) {
      var ind = statusList.length - index - 1;
      var cell = list.getElementsByClassName("requestInfo")[ind];

      self.updateRequestCellInfo(cell, infoList[index], statusList[index]);
    });
  },

  addBeggar: function (address, name) {    
    ContractFunctions.addBeggar(address, name).then(function(result) {
      
    }).catch(function(e) {
      console.log(e);
    });
  },

  /*Beggar function*/
  addRequest: function (amount, reason, receiptURL) {
    return ContractFunctions.addRequest(amount, reason, receiptURL).then(function(result) {
      //console.log("addRequest: " + result);
    }).catch(function(e) {
      console.log(e);
    });
  },

  /*Giver function*/
  changeRequestStatus: function (targetAddress, requestIndex, toStatus)  
  {
    return ContractFunctions.changeRequestStatus(targetAddress, requestIndex, 
      toStatus).then(function(result) {
      console.log("Done" + result);
    });
  },
  

  setupRequestModal: function () { 
      var self = this;

      var requestModal = document.getElementById('requestModal');
      var close = requestModal.getElementsByClassName("close")[0];
      var button = requestModal.getElementsByClassName("formButton")[0];
      var status = requestModal.getElementsByClassName("status")[0];
      close.onclick = function() {
        requestModal.style.display = "none";      
      };

    button.onclick =  function() {
      var amount = requestModal.getElementsByClassName("amount")[0].value;
      var reason = requestModal.getElementsByClassName("reason")[0].value;

      if (amount <= 0) {
          status.innerHTML = "Amount needs to be larger than 0";
      } else {
          button.innerHTML = "Ready to send...";    
          ContractFunctions.addRequest(amount, reason, "").then(function () {
            button.innerHTML = "Transaction sent";          
          }).catch(function (e) {
            console.log(e);
            button.innerHTML = "Transaction failed"; 
          });          
      }      
    };
  },

  setupBeggarModal: function () { 
    var self = this;

    var beggarModal = document.getElementById('beggarModal');
    var close = beggarModal.getElementsByClassName("close")[0];
    var button = beggarModal.getElementsByClassName("formButton")[0];
    var status = beggarModal.getElementsByClassName("status")[0];
    close.onclick = function() {
      beggarModal.style.display = "none";      
    };

    button.onclick =  function() {
      var address = beggarModal.getElementsByClassName("address")[0].value;
      var name = beggarModal.getElementsByClassName("name")[0].value;

      if (address == "") {
        status.innerHTML = "Address cannot be blank!";
      } else if (name == ""){
        status.innerHTML = "Name cannot be blank!";
      } 
      else {
        button.innerHTML = "Ready to send...";  
        ContractFunctions.addBeggar(address, name).then(function () {
          button.innerHTML = "Transaction sent";   
        }).catch(function (e) {
          console.log(e);
          button.innerHTML = "Transaction failed"; 
        });
      }      
    };
  },

  setupRequestListModal: function () {
      var self = this;

      var listModal = document.getElementById('listModal');
      var span = listModal.getElementsByClassName("close")[0];
      span.onclick = function() {
          listModal.style.display = "none";      
      };
  },

  setupBatchButton: function () {
      var self = this;

      var batchApprove = document.getElementById('batchApprove'); 
      var batchPaid = document.getElementById('batchPaid'); 


      batchApprove.addEventListener('click', function () {
        self.batchSendAndRefreshRequestCell(tempStorage.cells, tempStorage.addrs,
          tempStorage.requestIndices, ContractFunctions.RequestStatus.Approved);
      });
      batchPaid.addEventListener('click', function () {
        self.batchSendAndRefreshRequestCell(tempStorage.cells, tempStorage.addrs,
          tempStorage.requestIndices, ContractFunctions.RequestStatus.Paid);
      });
  },  

  addEventListener: function () {
    var self = this;

    // RoleUpdate event
    ContractFunctions.roleUpdateEvent({}, {from: 'latest', to: 'latest'}).then( function(event){
      event.watch(function(err, result){
        console.log("RoleUpdate");
        Refresh.refreshBeggarList().then(function () {
          self.showDefaultPage();
        });
      })
    }).catch(function(e) {
      throw e;
    });  

    // NewApproval event
    ContractFunctions.newApprovalEvent().then( function(event){
      event.watch(function(err, result){
        console.log("newApproval");
        Refresh.refreshBeggarList().then(function () {
          self.showDefaultPage();
        });
        //self.showRequestList(result.args._beggarAddress);
        //TODO: self.refreshApprovalPeningList();
        //TODO: self.refreshPaymentPeningList();
      })
    }).catch(function(e) {
      throw e;
    }); 

    // NewRequest event
    ContractFunctions.newRequestEvent().then( function(event){
      event.watch(function(err, result){
        console.log("NewRequest: " + result.args._beggarAddress);
        Refresh.refreshBeggarList().then(function () {
          self.showDefaultPage();
        });
        //TODO: self.refreshApprovalPeningList();
        //TODO: self.refreshPaymentPeningList();
      })
    }).catch(function(e) {
      throw e;
    }); 

    // NewPaid event
    ContractFunctions.newPaidEvent().then( function(event){
      event.watch(function(err, result){
        console.log("NewPaid");
        Refresh.refreshBeggarList().then(function () {
          self.showDefaultPage();
        });
        //TODO: self.refreshPaymentPendingList();
      })
    }).catch(function(e) {
      throw e;
    }); 

    // NewDispute event
    ContractFunctions.newDisputeEvent().then( function(event){
      event.watch(function(err, result){
        console.log("NewPaid");
        Refresh.refreshBeggarList().then(function () {
          self.showDefaultPage();
        });
        //TODO: self.refreshPaymentPendingList();
        //TODO: self.refreshApprovalPendingList();
        //TODO: self.refreshDisputeList();
      })
    }).catch(function(e) {
      throw e;
    });     

    //  DisputeResolved event
    ContractFunctions.disputeResolvedEvent().then( function(event){
      event.watch(function(err, result){
        console.log("NewPaid");
        Refresh.refreshBeggarList().then(function () {
          self.showDefaultPage();
        });
        //TODO: self.refreshPaymentPeningList();
        //TODO: self.refreshApprovalPendingList();
        //TODO: self.refreshDisputeList();
      })
    }).catch(function(e) {
      throw e;
    });     

    ContractFunctions.newRejectionEvent().then( function(event){
      event.watch(function(err, result){
        console.log("NewRejection");
        Refresh.refreshBeggarList().then(function () {
          self.showDefaultPage();
        });
        //TODO: self.refreshPaymentPeningList();
        //TODO: self.refreshApprovalPendingList();
        //TODO: self.refreshDisputeList();
      })
    }).catch(function(e) {
      throw e;
    }); 

    window.addEventListener('click', function (event) {
      var requestModal = document.getElementById('requestModal');
      var listModal = document.getElementById('listModal'); 
      var beggarModal = document.getElementById('beggarModal'); 

      if (event.target == requestModal) {
        requestModal.style.display = "none";
      } else if (event.target == listModal) {
        listModal.style.display = "none";
      } else if (event.target == beggarModal) {
        beggarModal.style.display = "none";
      }
    });

  }

};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }



  App.start();
});

