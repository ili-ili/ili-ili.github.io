
var minute = 60*1000;
var hour = 60*minute;;
var halfday = 12*hour;
var day = 2* halfday;

function pad2(n) {
	return n < 10 ? '0'+n : n;
}


function makeEvent(now, ev) {
	var out = {};
	for (var i in ev) out[i] = ev[i];

	var ts = moment(ev.start_time, 'hh:mm');
	var te = moment(ev.end_time, 'hh:mm');

	out.next_day = te.isBefore(ts);

	ts = moment(now).hours(ts.hours()).minutes(ts.minutes())
	te = moment(now).hours(te.hours()).minutes(te.minutes())

	if (out.next_day){
		te = te.add(1, 'day')
	}

	out.start = ts.toDate();
	out.end = te.toDate();
	out.original_event = ev;
	return out;
}

var Clock = {
	size: { w: 300, h: 300 },
	font: { size: 15 },
	now: new Date(),
	auto: true,
	pause: 0,
	enablesound: false,
	stroke_color: '#666',
	init_done: false,
	el: 'clock',
	speedup: 1,
	init: function() {
		if (this.init_done) return;
		this.init_done = true;
		this.r = this.size.w/2;
		this.r2 = this.r-15;
		this.center = { x: this.r, y: this.r };
		this.svg = SVG(this.el).size('100%').viewbox(0, 0, this.size.w, this.size.h).size('100%', '100%');//.fixSubPixelOffset();
		//this.plate = this.svg.circle(this.r2*1.5).attr({ cx: this.center.x, cy: this.center.y }).fill('#ffffff').stroke({ width: 1, color: "#777" });
		// this.svg.circle(this.r2*0.65).attr({ cx: this.center.x, cy: this.center.y }).fill({ color: this.stroke_color });
		this.eventsGroup = this.svg.group();
		// this.plate = this.svg.path(new SVG.PathArray(this.drawSector(this.r, 0, 350))).fill('#ffffff');

    	for (var n = 11; n >= 0; n--) {
    		var p = this.getAngleCoord(this.center, this.r-6, 30+30*n);
    		digit = this.svg.text('•').font({ size: 10 }).fill({ color: '#eee' });
    		var w = digit.node.clientWidth;
    		var h = digit.node.clientHeight;
    		digit.move(p.x - w/2, p.y - h/2 );
    		// this.rect(3, 10).move(48.5, 1).fill(r.marks).rotate(n * 30, 50, 50);
    	}

    	// this.arrow = this.svg.rect(5, this.r - 10).move(this.center.x, this.center.y).fill('#000000');
		var gradient = this.svg.gradient('linear', function(stop) {
			stop.at({ offset: 0, color: '#333', opacity: 0 })
			stop.at({ offset: 1, color: '#333', opacity: 1 })
		}).from(0, 0.65).to(0.4, 1);

		var tmp = new SVG.PathArray(this.drawSector(this.r2, 0, 90));
		this.arrow = this.svg.group();

    	this.arrowShadow = this.arrow.path(tmp).fill({ color: gradient }).attr({ id: "arrow" });
    	this.arrowLineShadow = this.arrow.line(0, 0, this.r2+10, 0).move(this.center.x, this.center.y+1).stroke({ width: 3, color: '#333', opacity: 0.3 });
    	this.arrowLine = this.arrow.line(0, 0, this.r2+10, 0).move(this.center.x, this.center.y).stroke({ width: 3, color: '#eee' });


    	// this.displayShadow = this.svg.circle(this.r2*0.6 + 1).attr({ cx: this.center.x, cy: this.center.y }).stroke({ color: this.stroke_color });
    	this.displayShadow = this.svg.circle(this.r2*0.6 + 1).attr({ cx: this.center.x, cy: this.center.y+1 }).fill({ color: '#333', opacity: 0.3})
        this.display = this.svg.circle(this.r2*0.6).attr({ cx: this.center.x, cy: this.center.y }).fill('#ffffff');//


        this.timeLabel = this.svg.text('07:00').font({ size: this.font.size*1.5 }).fill({ color: '#333' });

        var tx = this.center.x - this.timeLabel.node.clientWidth/2;
        var ty = this.center.y - this.timeLabel.node.clientHeight/2;
        this.timeLabel.move(tx, ty);

        this.label2Group = this.svg.group().move(tx - 12, ty + 5);

        this.icons = this.label2Group.group().scale(1);
        this.accessTimeIcon = this.icons.image('img/access-time.svg').hide();
        this.avTimerIcon = this.icons.image('img/av-timer.svg').hide();
        this.timerIcon = this.icons.image('img/timer.svg').hide();

        this.eventLabel1 = this.svg.text(' ').font({ size: this.font.size*0.55 }).fill({ color: '#777'});
        this.eventLabel2 = this.label2Group.text(' ').font({ size: this.font.size*1.5 }).move(17, -13).fill({ color: '#333'});
        this.eventLabel3 = this.svg.text(' ').font({ size: this.font.size*0.85 }).fill({ color: '#777'});

    	var self = this;
    	setInterval(function() {
    		if (self.pause) {
    			return;
    		}
    		if (self.speedup) {
    			self.auto = false;
    		}

    		if (self.auto) {
    			self.now = new Date();
    		} else {
    			self.now.setTime(self.now.getTime() + ((self.speedup)*1000) + ( self.speedup > 1 ? 1 : 0) );
    		}

            self.update();
            if (self.enablesound) {
            	self.tick.play();
            }
        }, 1000);
        this.now = new Date();//2015, 2, 8, 7, 0);
        this.update();
        this.setOnClick();

		this.tick = new buzz.sound( "sound/tick", {
		    formats: [ "ogg", "mp3" ]
		});
		this.tick.set("volume", 0.3);
	},
	turnOfAuto: function() {
		this.auto = false;
		if (this.return_auto) {
			clearTimeout(this.return_auto);
		}
		var self = this;
		self.return_auto = setTimeout(function(){
			self.auto = true;
		}, 60*1000);
	},
	setOnClick: function() {
		var self = this;
		$('body').on('click', '.sector', function(){
			var data = $(this).data();
			var text = $(this).parent().find('text');
			var sector = self.sectors[data.sector_id];
			var event = self.events[data.idx];
			ev = makeEvent(self.now, event);
			// console.log('click', this, ev, text[0]);
			$('.sector-group text').attr({'fill-opacity': 0 });
			if (self.selected == event) {
				self.selected = null;
				self.display.fill('#ffffff');
				self.hideEventLabel();
			} else {
				self.selected = event;
				self.display.fill(ev.color);
				// console.log(typeof ev.start, ev.start, ev.end, new Date(ev.start), new Date(ev.end));

				self.showEventLabel(ev);
				text.attr({'fill-opacity': 1 });
				// if (sector) {
				// 	sector.data('pos', sector.position())
				// 	sector.after(self.display);
				// }
			}
		});
	},
	update: function() {
		if (this.selected) {
			var ev = makeEvent(this.now, this.selected);
			console.log('event passed', ev.end.getTime() < this.now.getTime());
			if (ev.end.getTime() < this.now.getTime()) {
				this.selected = null;
				this.display.fill('#ffffff');
				this.hideEventLabel();
			} else {
				this.showEventLabel(ev);
			}
		}
		var hours = this.now.getHours();
		var minutes = this.now.getMinutes();
		// console.log('update', hours, minutes);
		this.arrow.rotate(this.timeToAngle(hours, minutes)-90, this.center.x, this.center.x);
		this.timeLabel.text([ pad2(hours), pad2(minutes) ].join(':'));
		this.timeLabel.move(this.center.x - this.timeLabel.node.clientWidth/2 - 3, this.center.y- this.timeLabel.node.clientHeight/2);

		var m = moment(this.now);

        this.eventLabel1.text(m.format('ddd MMM Do'));
        var y = this.center.y - this.eventLabel1.node.clientHeight - 15;
        this.eventLabel1.move(this.center.x - this.eventLabel1.node.clientWidth/2 - 2, y);

        this.eventLabel3.text(m.format(':ss'));
        var y = this.center.y + this.eventLabel3.node.clientHeight;
        this.eventLabel3.move(this.center.x - this.eventLabel3.node.clientWidth/2, y + 2);
		this.drawEvents();
	},
	showEventLabel: function (ev) {
		// console.log('showEventLabel', this.now, 'ev', ev.start, ev.end, moment(ev.end).diff(this.now, 'hours'));
		if (ev.next_day && moment(ev.end).diff(this.now, 'hours') > 24) {
			ev = makeEvent(moment(self.now).subtract(1, 'day'), ev); // dirty hack
		}

		this.icons.each(function(){ this.hide() });

        if (this.now.getTime() >= ev.start.getTime() && this.now.getTime() <= ev.end.getTime()) {
        	var duration = ev.end.getTime() - this.now.getTime();
        	this.timerIcon.show();
        } else if (this.now.getTime() < ev.start.getTime()) {
        	var duration = ev.start.getTime() - this.now.getTime();
        	this.avTimerIcon.show();
        }
    	var dr = moment.duration(duration);
    	var text = pad2(dr.hours())+':'+pad2(dr.minutes());
    	this.eventLabel2.text(text);

        // console.log('showEventLabel', duration, text);
        // this.label2Group.move(this.center.x - this.label2Group.node.getBoundingClientRect().width/3, y + 20);
        this.timeLabel.hide();// = 'none';
	},
	hideEventLabel: function() {
		this.timeLabel.show();//node.style.display = '';
		// this.eventLabel1.text('');
		this.eventLabel2.text('');
		this.icons.each(function(){ this.hide() });
	},
	set: function(hours, minutes, turn_off_auto) {
		if (turn_off_auto) {
			this.turnOfAuto();
		}
		this.now.setHours(hours);
		this.now.setMinutes(minutes);
		this.update();
	},
	getAngleCoord: function(p, r, angle) {
		return {
			x: p.x + r*Math.cos(-Math.PI*0.5+Math.PI*angle/180),
			y: p.y + r*Math.sin(-Math.PI*0.5+Math.PI*angle/180)
		};
	},
	timeToAngle: function(hours, minutes) {
		return 360 / 12 * ((hours + minutes / 60) % 12);
	},
	durationToAngle: function(duration) {
		var tmp = (duration*360) / halfday;
		if (tmp == 360) tmp = 359.9;
		return tmp;
	},
	drawSector: function(r, startAngle, endAngle, offset) {
		offset = offset || {x: 0, y: 0};
		var p1 = this.getAngleCoord(this.center, r, startAngle);
		var p2 = this.getAngleCoord(this.center, r, endAngle);
		var isBig = ((endAngle - startAngle > 180) ? 1 : 0);
		return [
			['M', this.center.x + offset.x, this.center.y + offset.y],
			['L', p1.x + offset.x, p1.y + offset.y],
			['A', r, r, 0, isBig, 1, p2.x + offset.x, p2.y + offset.y], ['Z']];
	},
	drawEvent: function(date, duration, r, ev) {
		var hours = date.getHours();
		var minutes = date.getMinutes();
		var angle = this.timeToAngle(hours, minutes);
		var duration_angle = this.durationToAngle(duration);
		var tmp = new SVG.PathArray(this.drawSector(r, angle, angle+duration_angle));
		var self = this;
		var group = this.eventsGroup.group()
			// .rotate(angle, this.center.x, this.center.y)
			.attr({ class: 'sector-group' });

		// var shadow = group.path(this.drawSector(r, 0, duration_angle - 1)) // , {x: 20, y: 20}
		var shadow = group.path(this.drawSector(r, angle, angle+duration_angle - 1, {x: 0, y: 1})) //
			// .move(this.center.x+5, 5)
			.attr({ class: 'shadow' })
			.fill({ color: '#333', opacity: 0.3 });

		// shadow.move(shadow.width(), shadow.height());
		// shadow.move(this.center.x, -5);
		// shadow.move(shadow.width()/3, shadow.height()/3);
// console.log('shadow', shadow, shadow.node);
		group.path(tmp)
			.fill(ev.color)
			.attr({
				title: ev.title +' '+hours+':'+minutes+' '+(duration/hour),
				class: 'sector'
			})//.stroke({ width: 1, color: this.stroke_color })
			.data(ev);
		var text = group.text(ev.title)
			.font({ size: this.font.size/2 })
			.move(this.center.x + this.r2*0.4, this.center.y + 3)
			.rotate(angle-90, this.center.x, this.center.y)
			.fill({ color: '#333', opacity: 0 }).front();
		if (ev.original_event == this.selected) {
			text.fill({ opacity: 1 });
		}
		return group;
	},
	drawEvents: function() {
		if (!this.events) return;
		this.eventsGroup.clear();
		var now = this.now.getTime();
		var now12h = now + halfday;
		this.current = [];
		this.sectors = [];
		this.main_label = false;

		var current_date = moment(this.now).subtract(1, 'day').hours(0).minutes(0).toDate();
		// console.log('current_date', current_date);
		// for (var i=0; i<this.events.length; i++) {
		var i =0, start = 0, end, last_start = -1;
		while(start <= now12h) {
			var ev = makeEvent(current_date, this.events[i]);

			if (ev.next_day) {
				current_date = moment(ev.end).hours(0).minutes(0);
			}

			start = ev.start.getTime();
			end = ev.end.getTime();

			// console.log('-->', i, ev.title, ev.start, ev.end, 'next:', ev.next_day, current_date);
			// console.log('  >', now12h, '>', start, end);
			// console.log('  >', ev.title, start > now12h, start < last_start);

			if (start < last_start) {
				break;
			}
			last_start = start;

			if ((start >= now && start < now12h) || (end > now && end < now12h)) {
				start = Math.max(start, now);
				end = Math.min(end, now12h);

				for (var j=this.current.length - 1; j>=0; j--) {
					if (this.current[j].end.getTime() <= start) {
						this.current.splice(j, 1);
					}
				}

				if (this.current.length) {
					// console.log('+===>this.current.length', this.current.length);
					ev.r = this.r2 - 20*this.current.length;
				} else {
					ev.r = this.r2;
				}
				ev.r = ev.r - 5*(start - now)/hour;

				// if (!ev.color) ev.color = this.getColor(i);
				var dt = new Date(start);
				var duration = end - start;
				if (duration == 0) { duration = 5*minute; }

				ev.sector_id = this.sectors.length;
				ev.idx = i;
				var sector = this.drawEvent(dt, duration, ev.r, ev);
				this.sectors.push(sector);

				this.current.push(ev);

			}

			i = (i + 1) % this.events.length;
		}
	},
	getData: function(url) {
		var self = this;
		$.ajax(url).success(function(data){
 			self.init();
			self.events = data;
			self.update();
		});
	}
};

$(function(){
	Clock.init();
	Clock.getData('js/events.json');
	$('#slider').val( Clock.now.getHours()*60 + Clock.now.getMinutes());
	$('#enablesound').click(function(){
		Clock.enablesound = !Clock.enablesound;
	});
	$('[name=speedup]').click(function(){
		Clock.speedup = parseInt($(this).val());
	});
	$('#reset').click(function(){
		Clock.speedup = false;
		Clock.auto = true;
		Clock.now = new Date();
		Clock.update();
		$('[name=speedup]').attr('checked', false);
		$('[name=speedup][value=1]').attr('checked', true);
		$('#slider').val( Clock.now.getHours()*60 + Clock.now.getMinutes());
	});
	$('#show_controls').click(function(e){
		e.preventDefault();
		$('#controls').toggle();
	})
});

