export const name = 'DSO_LayoutBuilder';

class LayoutBuilder {
	   
	   constructor(config) {
	       let defaults = {
                    items: [{width: 0.5, height:0.5, depth:0.5},{width: 0.5, height:0.5, depth:0.5},{width: 0.5, height:0.5, depth:0.5},{width: 0.5, height:0.5, depth:0.5},{width: 0.5, height:0.5, depth:0.5}]
                };
        
    	    this.config = {
        	    ...defaults,
            	...config
        	};

        	this.init();
    }

    init = () =>{
       	this.dimensions = this.calcDimensionsSquare();

    }

    calcDimensionsSquare = () =>{

    	this.noItems = this.calcTotalArea();
        console.log('this.noItems: '+this.noItems);

        this.totalArea = this.roundToSquare(this.noItems);
        this.totalArea = (this.totalArea*8);
        console.log('this.totalArea nearest square: '+this.totalArea);

    	let width = 4 + this.noItems *4; 
    	let depth = 8
        console.log(width,depth);
    	return {	width:width,
    				height:10, 
    				depth:depth};

    }

    calcTotalArea = () =>{
    	let area = this.config.items.length;
    	if(this.isOdd(area)){
    		area++;
    	};
    	return area;
    }

	isOdd = (num) => {
		return (num % 2) == 1;
	}

    roundToSquare = (number) => {
        let sRt = Math.sqrt(number);
        let cRt = Math.ceil(sRt);
        let nextSquare = cRt*cRt;
        return nextSquare;
    }
}

export {LayoutBuilder}