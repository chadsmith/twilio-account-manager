$(function(){
	$('.account').droppable({
		drop: function(event, ui) {
			var
				$el = ui.draggable,
				oldSid = $el.parent().attr('id'),
				newSid = $(this).attr('id');
			if(oldSid != newSid) {
				$.post('/move', { sid: $el.attr('id'), oldSid: oldSid, newSid: newSid });
				$el.appendTo($(this));
			}
		}
	});
	$('.number').draggable({ helper: 'clone', cursor: 'move', revert: 'invalid' });
	if('localStorage' in window) {
		$('form').submit(function() {
			$('input').each(function() {
				localStorage[$(this).attr('name')] = $(this).val();
			});
		});
		$('input').each(function() {
			$(this).val(localStorage[$(this).attr('name')]);
		});
	}
});
