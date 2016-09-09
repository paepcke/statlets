function runSlots(){
    var slotOne;
    var slotTwo;
    var slotThree;
    
    var images = ["https://www.dropbox.com/s/05q8ypp468ds6ua/9H17QFk.png?dl=1",
                  "https://www.dropbox.com/s/l01l8gyqzc9utzf/9RmpXTy.png?dl=1",
                  "https://www.dropbox.com/s/f7inx59ws0hipxf/VJnmtt5.png?dl=1"];
    
    slotOne = Math.floor(Math.random() * (3 - 1 + 1)) + 1;
    slotTwo = Math.floor(Math.random() * (3 - 1 + 1)) + 1;
    slotThree = Math.floor(Math.random() * (3 - 1 + 1)) + 1;
    
    $('.logger').html('');
    $('.logger').html('');
    
    // Only change code below this line.
    $($('.slot')[0]).html('<img src = "' + images[slotOne-1] + '">');
    $($('.slot')[1]).html('<img src = "' + images[slotTwo-1] + '">');
    $($('.slot')[2]).html('<img src = "' + images[slotThree-1] + '">');
    // Only change code above this line.
    
    if (slotOne !== slotTwo || slotTwo !== slotThree) {
         return (null);
    }
    
    if(slotOne !== undefined && slotTwo !== undefined && slotThree !== undefined){
      $('.logger').html('<center>You Won!</center>');
    }
    
    return [slotOne, slotTwo, slotThree];
  }

  $(document).ready(function(){
     $('.go').click(function(){
       runSlots();
     });
  });
